import RunPredictionButton from "./RunPredictionButton";

export default function WebsiteSelector({ websites, selectedWebsite, onSelect }) {
  const hasMultiple = websites.length > 1;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 px-6 py-4 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Left: Heading and Website Indicator / Dropdown */}
      <div className="flex items-center gap-4 flex-wrap">
        <h2 className="text-2xl font-bold text-blue-700 tracking-tight">
          Cyber Threat Detection Dashboard
        </h2>

        {selectedWebsite && (
          <div className="flex items-center gap-2">
            {hasMultiple ? (
              <select
                value={selectedWebsite.id}
                onChange={(e) => onSelect(Number(e.target.value))}
                aria-label="Select Monitored Website"
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer"
              >
                {websites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name} ({site.base_url})
                  </option>
                ))}
              </select>
            ) : (
              <span className="bg-blue-50 text-blue-700 border border-blue-100 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Monitoring: {selectedWebsite.name} ({selectedWebsite.base_url})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right: Run Prediction Button */}
      {selectedWebsite && (
        <div className="shrink-0">
          <RunPredictionButton websiteId={selectedWebsite.id} />
        </div>
      )}
    </div>
  );
}
