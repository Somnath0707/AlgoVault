import { CheatReport } from "../analysis";

interface Props {
  contest: any;
  ranking: number;
  isExpanded: boolean;
  analyzing: boolean;
  results: Record<string, CheatReport>;
  onExpand: () => void;
}

export default function ContestCard({
  contest,
  ranking,
  isExpanded,
  analyzing,
  results,
  onExpand,
}: Props) {
  const pageNum = Math.ceil(ranking / 25);
  const replayUrl = `https://leetcode.com/contest/${contest.titleSlug}/ranking/${pageNum}/?region=global_v2`;

  return (
    <div
      className="
        relative mb-3 overflow-hidden rounded-xl
        bg-gradient-to-br from-gray-900 to-gray-800
        border border-gray-700/60
        shadow-sm hover:shadow-md
        transition-all duration-200
      "
    >
      {/* Accent Bar */}
      <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-green-400/80 to-blue-500/80" />

      {/* Header */}
      <div
        onClick={onExpand}
        className="
          cursor-pointer px-4 py-3 pl-5
          flex items-center justify-between
          hover:bg-white/[0.03] transition
        "
      >
        <div className="flex-1 pr-2">
          <div className="text-sm font-semibold text-gray-200 truncate">
            {contest.title}
          </div>
          <div className="text-[11px] text-gray-400">Global Ranking</div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-black/40 text-gray-300">
            #{ranking}
          </span>

          <a
            href={replayUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="
              h-7 w-7 rounded-full
              bg-blue-600/80 hover:bg-blue-500
              flex items-center justify-center
              text-white text-xs
              transition
            "
            title="View Contest Ranking"
          >
            ▶
          </a>
        </div>
      </div>

      {/* Expanded Section */}
      {isExpanded && (
        <div className="border-t border-gray-700/60 bg-black/40 px-4 py-3 pl-5 animate-fade-in">
          {analyzing ? (
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 py-2">
              <span className="animate-spin">⏳</span>
              Analyzing keystrokes…
            </div>
          ) : Object.keys(results).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(results).map(([qTitle, report]) => (
                <div key={qTitle}>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-xs font-medium text-gray-300 truncate"
                      title={qTitle}
                    >
                      {qTitle}
                    </span>

                    <span
                      className={`
                        text-[10px] px-2 py-0.5 rounded-full
                        border border-gray-700
                        bg-gray-900
                        ${report.color}
                      `}
                    >
                      {report.label}
                    </span>
                  </div>

                  {report.details.length > 0 && (
                    <div className="mt-1 ml-2 pl-2 border-l border-gray-700 space-y-0.5">
                      {report.details.map((d, i) => (
                        <div
                          key={i}
                          className="text-[10px] text-gray-400 leading-snug"
                        >
                          • {d}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-xs text-gray-500 py-2">
              No submission data found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
