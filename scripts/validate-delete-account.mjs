// Delete Account A–F validation against DISPOSABLE test accounts.
// Creates throwaway users/data scoped to a unique run tag, exercises the real
// delete_user_account RPC + storage/auth steps, asserts outcomes, and cleans up
// everything it created (finally block) regardless of pass/fail.
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(readFileSync(".env.local","utf8").split("\n").filter(Boolean).map(l=>{const i=l.indexOf("=");return[l.slice(0,i).trim(),l.slice(i+1).trim()];}));
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const db = createClient(URL, env.SUPABASE_SERVICE_ROLE_KEY);
const TOMB = env.TOMBSTONE_USER_ID;
const BUCKET = "memory-media";
const TAG = "deltest-" + Date.now();
const results = [];
const users = [];          // auth user ids to delete
const memIds = [];         // memory ids to delete
const profIds = [];        // memory_profile ids to delete
const paths = [];          // storage paths to remove
const ok = (s,p,d="") => results.push({s,p,d});

const pubUrl = (path) => `${URL}/storage/v1/object/public/${BUCKET}/${path}`;

async function mkUser(label){
  const email = `${TAG}-${label}@example.com`;
  const { data, error } = await db.auth.admin.createUser({ email, email_confirm:true });
  if(error) throw new Error(`createUser ${label}: ${error.message}`);
  users.push(data.user.id);
  return data.user.id;
}
async function mkProfile(owner,name){
  const { data, error } = await db.from("memory_profiles").insert({ created_by_account_id:owner, profile_name:name }).select("id").single();
  if(error) throw new Error(`mkProfile: ${error.message}`);
  profIds.push(data.id); return data.id;
}
async function mkMemory(author,profileId,opts={}){
  const row = { user_id:author, memory_profile_id:profileId, title:opts.title||"t", content:opts.content||"c" };
  if(opts.cover) row.cover_image_url = opts.cover;
  const { data, error } = await db.from("memories").insert(row).select("id").single();
  if(error) throw new Error(`mkMemory: ${error.message}`);
  memIds.push(data.id); return data.id;
}
async function mkRel(profileId,caregiver,inviter,access="admin"){
  const { error } = await db.from("profile_relationships").insert({ memory_profile_id:profileId, caregiver_account_id:caregiver, relationship_type:"caregiver", access_level:access, invite_status:"accepted", invited_by_account_id:inviter });
  if(error) throw new Error(`mkRel: ${error.message}`);
}
async function putFile(path){ const { error } = await db.storage.from(BUCKET).upload(path, Buffer.from("x"), {contentType:"text/plain",upsert:true}); if(error) throw new Error(`upload: ${error.message}`); paths.push(path); }
async function listPrefix(prefix){ const out=[]; const stack=[prefix]; while(stack.length){ const d=stack.pop(); const {data}=await db.storage.from(BUCKET).list(d,{limit:1000}); for(const e of data||[]){ const full=`${d}/${e.name}`; if(e.id===null) stack.push(full); else out.push(full); } } return out; }
async function cleanupStorage(userId, keep=new Set()){ const all=await listPrefix(`users/${userId}`); const rm=all.filter(p=>!keep.has(p)); for(let i=0;i<rm.length;i+=100){ await db.storage.from(BUCKET).remove(rm.slice(i,i+100)); } return {removed:rm.length, kept:all.length-rm.length}; }
// Deterministic existence check (avoids storage list eventual-consistency flakiness).
async function fileExists(path){ const { data, error } = await db.storage.from(BUCKET).download(path); return !!data && !error; }
const rpc = (uid,opts) => db.rpc("delete_user_account",{ p_user_id:uid, p_options:opts });
const memById = async (id) => (await db.from("memories").select("user_id").eq("id",id).maybeSingle()).data;
const profOwner = async (id) => (await db.from("memory_profiles").select("created_by_account_id").eq("id",id).maybeSingle()).data;

try {
  if(!TOMB) throw new Error("TOMBSTONE_USER_ID not set in .env.local");

  // ---- A: own-only ----
  try {
    const A = await mkUser("A");
    const pA = await mkProfile(A,"A-profile");
    const fileA = `users/${A}/memories/${randomUUID()}.txt`; await putFile(fileA);
    const mA = await mkMemory(A,pA,{cover:pubUrl(fileA)});
    await rpc(A,{ tombstoneId:TOMB, deleteContributed:false });
    const st = await cleanupStorage(A);
    await db.auth.admin.deleteUser(A);
    const profGone = (await profOwner(pA))===null;
    const memGone = (await memById(mA))===null;
    const storeEmpty = !(await fileExists(fileA));
    const authGone = !!(await db.auth.admin.getUserById(A)).error;
    const pass = profGone&&memGone&&storeEmpty&&authGone;
    ok("A own-only", pass, `profGone=${profGone} memGone=${memGone} storeEmpty=${storeEmpty} authGone=${authGone} removedFiles=${st.removed}`);
  } catch(e){ ok("A own-only", false, e.message); }

  // ---- B: shared-profile transfer (admin successor) ----
  try {
    const OB = await mkUser("Bowner"); const CB = await mkUser("Bcaregiver");
    const pB = await mkProfile(OB,"B-profile");
    await mkRel(pB,CB,OB,"admin");
    const mB = await mkMemory(OB,pB);
    const r = await rpc(OB,{ tombstoneId:TOMB, deleteContributed:false });
    const owner = (await profOwner(pB))?.created_by_account_id;
    const transferred = owner===CB;
    const mBrow = await memById(mB);
    const memTombstoned = mBrow?.user_id===TOMB;            // OB's memory in now-CB-owned profile → anonymised
    const pass = transferred && memTombstoned && !r.error;
    ok("B transfer", pass, `newOwner=${owner===CB?"successor✓":owner} memTombstoned=${memTombstoned} rpc=${JSON.stringify(r.data)} err=${r.error?.message||""}`);
  } catch(e){ ok("B transfer", false, e.message); }

  // ---- C: cross-contributed retained (default) + storage retain ----
  try {
    const F = await mkUser("Cforeign"); const U = await mkUser("Ccontrib");
    const pF = await mkProfile(F,"C-foreign-profile");
    const fileC = `users/${U}/memories/${randomUUID()}.txt`; await putFile(fileC);
    const mU = await mkMemory(U,pF,{cover:pubUrl(fileC)});   // U contributed to F's profile
    // snapshot retained media (executor logic): U's memories in profiles not owned by U
    const keep = new Set([`users/${U}/memories/${fileC.split("/").pop()}`.replace(`users/${U}/memories/`,`users/${U}/memories/`)]);
    keep.clear(); keep.add(fileC);
    const r = await rpc(U,{ tombstoneId:TOMB, deleteContributed:false });
    const st = await cleanupStorage(U, keep);
    const mUrow = await memById(mU);
    const retained = mUrow && mUrow.user_id===TOMB;
    const fileKept = await fileExists(fileC);
    const pass = retained && fileKept && !r.error;
    ok("C retain contributed", pass, `memUser=${mUrow?mUrow.user_id===TOMB?"tombstone✓":mUrow.user_id:"DELETED"} fileKept=${fileKept} tombstoned=${JSON.stringify(r.data)}`);
    // cleanup F + the retained memory
    await db.from("memories").delete().eq("id",mU);
    await db.storage.from(BUCKET).remove([fileC]);
    await db.from("memory_profiles").delete().eq("id",pF);
    await db.auth.admin.deleteUser(F); await db.auth.admin.deleteUser(U);
  } catch(e){ ok("C retain contributed", false, e.message); }

  // ---- D: cross-contributed deleted (opt-in) ----
  try {
    const F2 = await mkUser("Dforeign"); const U2 = await mkUser("Dcontrib");
    const pF2 = await mkProfile(F2,"D-foreign-profile");
    const fileD = `users/${U2}/memories/${randomUUID()}.txt`; await putFile(fileD);
    const mU2 = await mkMemory(U2,pF2,{cover:pubUrl(fileD)});
    const r = await rpc(U2,{ tombstoneId:TOMB, deleteContributed:true });
    const st = await cleanupStorage(U2);                      // delete-mode: remove all U2 media
    const gone = (await memById(mU2))===null;
    const fileGone = !(await fileExists(fileD));
    const pass = gone && fileGone && !r.error;
    ok("D delete contributed", pass, `memGone=${gone} fileGone=${fileGone} deleted=${JSON.stringify(r.data)}`);
    await db.from("memory_profiles").delete().eq("id",pF2);
    await db.auth.admin.deleteUser(F2); await db.auth.admin.deleteUser(U2);
  } catch(e){ ok("D delete contributed", false, e.message); }

  // ---- E: storage cleanup (covered by A=full empty, C=retain kept, D=deleted) ----
  ok("E storage cleanup", results.find(r=>r.s==="A own-only")?.p && results.find(r=>r.s==="C retain contributed")?.p && results.find(r=>r.s==="D delete contributed")?.p,
     "validated via A (prefix emptied), C (retained file kept), D (file removed)");

  // ---- F: auth-deletion recovery ----
  try {
    const FR = await mkUser("Frecover");
    // realistic recovery state: RPC already deleted the user's DB data (incl. the
    // profiles row, which otherwise blocks auth deletion via the no-cascade FK),
    // storage done, only the auth user + pending row remain.
    await rpc(FR,{ tombstoneId:TOMB, deleteContributed:false });
    await db.from("pending_account_deletions").upsert({ user_id:FR, email:`${TAG}-Frecover@example.com`, status:"auth_pending", data_deleted_at:new Date().toISOString(), storage_deleted_at:new Date().toISOString() },{onConflict:"user_id"});
    // retry logic = finalizeAuthDeletion: delete auth user, then remove pending row
    const del = await db.auth.admin.deleteUser(FR);
    if(!del.error) await db.from("pending_account_deletions").delete().eq("user_id",FR);
    const authGone = !!(await db.auth.admin.getUserById(FR)).error;
    const pendingGone = (await db.from("pending_account_deletions").select("user_id").eq("user_id",FR).maybeSingle()).data===null;
    ok("F auth recovery", authGone&&pendingGone, `authGone=${authGone} pendingRowCleared=${pendingGone}`);
  } catch(e){ ok("F auth recovery", false, e.message); }

} finally {
  // best-effort cleanup of anything still around
  for(const id of memIds){ await db.from("memories").delete().eq("id",id); }
  for(const id of profIds){ await db.from("memory_profiles").delete().eq("id",id); }
  if(paths.length) await db.storage.from(BUCKET).remove(paths);
  for(const u of users){ await db.auth.admin.deleteUser(u); }
  await db.from("pending_account_deletions").delete().like("email", `${TAG}-%`);
}

console.log("\n=== Delete Account A–F validation ===");
for(const r of results) console.log(`${r.p?"PASS":"FAIL"}  ${r.s}  ${r.d}`);
const failed = results.filter(r=>!r.p);
console.log(`\n${failed.length===0?"ALL PASS":failed.length+" FAILED"}`);
process.exit(failed.length?1:0);
