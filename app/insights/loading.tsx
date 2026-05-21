export default function LoadingInsightsPage() {

  return (

    <div className="max-w-7xl mx-auto p-6 space-y-8 animate-pulse">

      {/* HEADER */}

      <div className="space-y-4">

        <div className="h-10 w-40 rounded-full bg-gray-200" />

        <div className="h-16 w-[420px] rounded-2xl bg-gray-200" />

        <div className="h-6 w-[520px] rounded-xl bg-gray-100" />

      </div>

      {/* AI SUMMARY */}

      <div className="rounded-[32px] border bg-white p-8 shadow-sm space-y-6">

        <div className="h-10 w-72 rounded-2xl bg-gray-200" />

        <div className="space-y-4">

          <div className="h-24 rounded-3xl bg-gray-100" />

          <div className="h-24 rounded-3xl bg-gray-100" />

          <div className="h-24 rounded-3xl bg-gray-100" />

        </div>

      </div>

      {/* ANALYTICS GRID */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

        {Array.from({
          length: 6,
        }).map((_, index) => (

          <div
            key={index}
            className="rounded-[32px] border bg-white p-8 shadow-sm"
          >

            <div className="space-y-5">

              <div className="h-5 w-40 rounded-xl bg-gray-200" />

              <div className="h-14 w-32 rounded-2xl bg-gray-300" />

              <div className="space-y-3">

                <div className="h-4 rounded-lg bg-gray-100" />

                <div className="h-4 rounded-lg bg-gray-100" />

                <div className="h-4 rounded-lg bg-gray-100" />

              </div>

            </div>

          </div>
        ))}

      </div>

      {/* CHART PLACEHOLDERS */}

      <div className="space-y-8">

        {Array.from({
          length: 5,
        }).map((_, index) => (

          <div
            key={index}
            className="rounded-[32px] border bg-white p-8 shadow-sm"
          >

            <div className="space-y-6">

              <div className="h-10 w-64 rounded-2xl bg-gray-200" />

              <div className="h-[320px] rounded-3xl bg-gray-100" />

            </div>

          </div>
        ))}

      </div>

    </div>
  );
}