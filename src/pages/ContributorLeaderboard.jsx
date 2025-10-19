import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FaStar, FaCode, FaUsers, FaGithub, FaSearch } from "react-icons/fa";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { useTheme } from "../ThemeContext";
import "../styles/leaderboard.css";
import AOS from "aos";
import "aos/dist/aos.css";

const GITHUB_REPO = import.meta.env.VITE_GITHUB_REPO || "RhythmPahwa14/AlgoVisualizer";
const token = import.meta.env.VITE_GITHUB_TOKEN;

// Points for levels
const POINTS = { "level-1": 3, "level-2": 7, "level-3": 10 };

// --- helpers ---
const normalize = (s) => (s || "").toLowerCase().replace(/[’‘`]/g, "'").trim();
const canonicalLevel = (label) => {
  const n = normalize(label).replace(/\s*[:\-_]\s*/g, "-"); // "level 1" / "level:1" → "level-1"
  const m = n.match(/^level-(1|2|3)$/);
  return m ? `level-${m[1]}` : null;
};

// small badge
const Badge = ({ count, label, color }) => (
  <div className="badge" style={color}>
    <FaCode style={{ marginRight: 6, fontSize: 12 }} />
    <span>
      {count} {label}
    </span>
    <style jsx>{`
      .badge {
        display: flex;
        align-items: center;
        padding: 4px 12px;
        border-radius: 9999px;
        font-size: 13px;
        font-weight: 500;
        background: rgba(0, 0, 0, 0.04);
      }
    `}</style>
  </div>
);

// skeleton
const SkeletonLoader = ({ isDark }) => (
  <div
    className="skeleton-loader"
    style={{
      background: isDark ? "#23272f" : "#fff",
      border: `1px solid ${isDark ? "#444" : "#eee"}`
    }}
  >
    <div className="skeleton-header">
      <div>#</div>
      <div>Contributor</div>
      <div>Contributions</div>
    </div>
    <div>
      {[...Array(10)].map((_, i) => (
        <div key={i} className="skeleton-row">
          <div className="skeleton-avatar" />
          <div className="skeleton-avatar" style={{ width: 40, height: 40 }} />
          <div className="skeleton-info">
            <div className="skeleton-bar" style={{ width: 96 }} />
            <div className="skeleton-badges">
              <div className="skeleton-badge" />
              <div className="skeleton-badge" />
            </div>
          </div>
        </div>
      ))}
    </div>
    <style jsx>{`
      .skeleton-loader {
        border-radius: 16px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        overflow: hidden;
        margin-bottom: 24px;
      }
      .skeleton-header {
        display: flex;
        justify-content: space-between;
        padding: 16px;
        font-size: 15px;
        font-weight: 500;
        background: #f6f6f6;
        border-bottom: 1px solid #eee;
      }
      .skeleton-row {
        display: flex;
        align-items: center;
        padding: 16px;
        gap: 16px;
      }
      .skeleton-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #e5e7eb;
        animation: pulse 1.5s infinite;
      }
      .skeleton-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .skeleton-bar {
        height: 16px;
        border-radius: 8px;
        background: #e5e7eb;
        animation: pulse 1.5s infinite;
      }
      .skeleton-badges {
        display: flex;
        gap: 8px;
      }
      .skeleton-badge {
        width: 48px;
        height: 24px;
        border-radius: 9999px;
        background: #e5e7eb;
        animation: pulse 1.5s infinite;
      }
      @keyframes pulse {
        0% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
        100% {
          opacity: 1;
        }
      }
    `}</style>
  </div>
);

export default function ContributorsLeaderboard() {
  const [contributors, setContributors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [stats, setStats] = useState({
    flooredTotalPRs: 0,
    totalContributors: 0,
    flooredTotalPoints: 0
  });
  const [searchTerm, setSearchTerm] = useState("");
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    const fetchMergedPRsAndScore = async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        const contributorsMap = {};
        const PER_PAGE = 100;
        const MAX_PAGES = 10; // Search API caps at 1000

        const baseQ = `repo:${GITHUB_REPO}+is:pr+is:merged`;

        for (let page = 1; page <= MAX_PAGES; page++) {
          const url = `https://api.github.com/search/issues?q=${baseQ}&per_page=${PER_PAGE}&page=${page}`;
          const res = await fetch(url, {
            headers: {
              Accept: "application/vnd.github+json",
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            }
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            setErrorMsg(err?.message || `GitHub API error (status ${res.status})`);
            break;
          }
          const data = await res.json();
          const items = Array.isArray(data.items) ? data.items : [];
          if (items.length === 0) break;

          items.forEach((item) => {
            const author = item?.user?.login;
            if (!author) return;

            const levelLabels = (item.labels || [])
              .map((l) => canonicalLevel(l.name))
              .filter(Boolean);

            let points = 0;
            levelLabels.forEach((lvl) => {
              if (POINTS[lvl]) points += POINTS[lvl];
            });

            if (!contributorsMap[author]) {
              contributorsMap[author] = {
                username: author,
                avatar: `https://github.com/${author}.png`,
                profile: `https://github.com/${author}`,
                points: 0,
                prs: 0
              };
            }
            contributorsMap[author].prs += 1;
            contributorsMap[author].points += points;
          });

          if (items.length < PER_PAGE) break;
        }

        const arr = Object.values(contributorsMap);
        const sorted = arr.sort(
          (a, b) => b.points - a.points || b.prs - a.prs || a.username.localeCompare(b.username)
        );
        const ranked = sorted.map((c, i) => ({ ...c, rank: i + 1 }));
        setContributors(ranked);

        const totalPRs = ranked.reduce((s, c) => s + c.prs, 0);
        const totalPoints = ranked.reduce((s, c) => s + c.points, 0);
        setStats({
          flooredTotalPRs: Math.floor(totalPRs / 10) * 10,
          totalContributors: Math.floor(ranked.length / 10) * 10,
          flooredTotalPoints: Math.floor(totalPoints / 10) * 10
        });

        if (!errorMsg && ranked.length === 0) {
          setErrorMsg("No merged PRs found in this repository.");
        }
      } catch (e) {
        setErrorMsg(e?.message || "Unexpected error while fetching data.");
      } finally {
        setLoading(false);
      }
    };

    fetchMergedPRsAndScore();
  }, []);

  const filtered = contributors.filter((c) =>
    c.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const indexOfLast = currentPage * PAGE_SIZE;
  const indexOfFirst = indexOfLast - PAGE_SIZE;
  const pageRows = filtered.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const buttonStyle = {
    padding: "8px 16px",
    borderRadius: "8px",
    background: isDark ? "#23272f" : "#e0e7ff",
    color: isDark ? "#a78bfa" : "#3730a3",
    border: "none",
    fontWeight: "500",
    cursor: "pointer",
    margin: "0 4px",
    opacity: 1,
    transition: "opacity 0.2s"
  };
  const buttonActiveStyle = {
    ...buttonStyle,
    background: isDark ? "#3b82f6" : "#2563eb",
    color: "#fff"
  };
  const buttonDisabledStyle = {
    ...buttonStyle,
    opacity: 0.5,
    cursor: "not-allowed"
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "32px 8px"
      }}
      data-aos="fade-up"
      data-aos-duration="1000"
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* header */}
        <motion.div
          style={{ textAlign: "center", marginBottom: 48, padding: "0 8px" }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          data-aos="fade-down"
          data-aos-duration="1000"
        >
          <h1
            style={{
              fontSize: 32,
              fontWeight: 700,
              marginBottom: 12,
              color: "#6366f1"
            }}
          >
            GSSoC'25 Leaderboard
          </h1>
          <p
            style={{
              fontSize: 17,
              maxWidth: 600,
              margin: "0 auto",
              color: isDark ? "#b3b3b3" : "#555",
              lineHeight: 1.6
            }}
          >
            Merged PRs count for each contributor. Points are awarded only when PRs carry level
            labels.
          </p>
        </motion.div>

        {/* search */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 24
          }}
          data-aos="fade-up"
          data-aos-delay="200"
        >
          <div style={{ position: "relative", width: "100%", maxWidth: 320 }}>
            <input
              type="text"
              placeholder="Search contributor..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: "100%",
                padding: "8px 16px 8px 36px",
                borderRadius: 8,
                border: `1px solid ${isDark ? "#444" : "#ddd"}`,
                background: isDark ? "#23272f" : "#fff",
                color: isDark ? "#fff" : "#222",
                fontSize: 15,
                outline: "none"
              }}
            />
            <FaSearch
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: isDark ? "#b3b3b3" : "#aaa"
              }}
            />
          </div>
        </div>

        {/* stats */}
        <div
          style={{
            display: "flex",
            gap: 18,
            marginBottom: 16,
            flexWrap: "wrap"
          }}
          data-aos="fade-up"
          data-aos-delay="300"
        >
          <div
            style={{
              flex: 1,
              minWidth: 220,
              padding: 24,
              borderRadius: 16,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              border: `1px solid ${isDark ? "#444" : "#eee"}`,
              background: isDark
                ? "linear-gradient(135deg,#23272f,#1a1d23)"
                : "linear-gradient(135deg,#e0e7ff,#f3f4f6)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: isDark ? "rgba(59,130,246,0.2)" : "#dbeafe",
                  color: isDark ? "#60a5fa" : "#2563eb",
                  marginRight: 16
                }}
              >
                <FaUsers style={{ fontSize: 22 }} />
              </div>
              <div>
                <p style={{ fontSize: 14, color: isDark ? "#b3b3b3" : "#555" }}>Contributors</p>
                <p
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: isDark ? "#fff" : "#222"
                  }}
                >
                  {loading ? "..." : stats.totalContributors}+
                </p>
              </div>
            </div>
          </div>
          <div
            style={{
              flex: 1,
              minWidth: 220,
              padding: 24,
              borderRadius: 16,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              border: `1px solid ${isDark ? "#444" : "#eee"}`,
              background: isDark
                ? "linear-gradient(135deg,#23272f,#1a1d23)"
                : "linear-gradient(135deg,#e0e7ff,#f3f4f6)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: isDark ? "rgba(16,185,129,0.2)" : "#bbf7d0",
                  color: isDark ? "#34d399" : "#059669",
                  marginRight: 16
                }}
              >
                <FaCode style={{ fontSize: 22 }} />
              </div>
              <div>
                <p style={{ fontSize: 14, color: isDark ? "#b3b3b3" : "#555" }}>Pull Requests</p>
                <p
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: isDark ? "#fff" : "#222"
                  }}
                >
                  {loading ? "..." : stats.flooredTotalPRs}+
                </p>
              </div>
            </div>
          </div>
          <div
            style={{
              flex: 1,
              minWidth: 220,
              padding: 24,
              borderRadius: 16,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              border: `1px solid ${isDark ? "#444" : "#eee"}`,
              background: isDark
                ? "linear-gradient(135deg,#23272f,#1a1d23)"
                : "linear-gradient(135deg,#e0e7ff,#f3f4f6)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: isDark ? "rgba(139,92,246,0.2)" : "#ede9fe",
                  color: isDark ? "#a78bfa" : "#7c3aed",
                  marginRight: 16
                }}
              >
                <FaStar style={{ fontSize: 22 }} />
              </div>
              <div>
                <p style={{ fontSize: 14, color: isDark ? "#b3b3b3" : "#555" }}>Total Points</p>
                <p
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: isDark ? "#fff" : "#222"
                  }}
                >
                  {loading ? "..." : stats.flooredTotalPoints}+
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* error */}
        {!!errorMsg && (
          <div
            style={{
              marginBottom: 24,
              padding: "12px 16px",
              borderRadius: 8,
              border: `1px solid ${isDark ? "#9f1239" : "#fecaca"}`,
              background: isDark ? "#3f1d1d" : "#fee2e2",
              color: isDark ? "#fecaca" : "#7f1d1d"
            }}
            data-aos="fade-up"
          >
            {errorMsg}
          </div>
        )}

        {loading ? (
          <SkeletonLoader isDark={isDark} />
        ) : (
          <div
            style={{
              borderRadius: 16,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              border: `1px solid ${isDark ? "#444" : "#eee"}`,
              overflow: "hidden",
              margin: "0 8px"
            }}
            data-aos="fade-up"
            data-aos-delay="400"
          >
            <div className="head-titles">
              <div>
                <h3>Rank</h3>
              </div>
              <div>
                <h3>Profile</h3>
              </div>
              <div className="head-state">
                <h3>PR's</h3>
                <h3>Points</h3>
              </div>
            </div>

            <div>
              {pageRows.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    color: isDark ? "#b3b3b3" : "#555",
                    padding: 16
                  }}
                >
                  No contributors found.
                </div>
              ) : (
                pageRows.map((c, idx) => (
                  <motion.div
                    className="leaderboard"
                    key={c.username}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.03 }}
                    style={{
                      padding: "20px 24px",
                      borderBottom: `1px solid ${isDark ? "#444" : "#eee"}`,
                      background:
                        idx % 2 === 0
                          ? isDark
                            ? "#23272f"
                            : "#fff"
                          : isDark
                          ? "#1a1d23"
                          : "#f6f6f6"
                    }}
                    data-aos="fade-up"
                    data-aos-delay={`${400 + idx * 50}`}
                  >
                    {/* rank */}
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 500,
                        marginRight: 16,
                        background:
                          c.rank === 1
                            ? isDark
                              ? "rgba(253,224,71,0.2)"
                              : "#fef9c3"
                            : c.rank === 2
                            ? isDark
                              ? "rgba(156,163,175,0.2)"
                              : "#f3f4f6"
                            : c.rank === 3
                            ? isDark
                              ? "rgba(251,191,36,0.2)"
                              : "#fef3c7"
                            : isDark
                            ? "#23272f"
                            : "#e5e7eb",
                        color:
                          c.rank === 1
                            ? isDark
                              ? "#fde047"
                              : "#ca8a04"
                            : c.rank === 2
                            ? isDark
                              ? "#d1d5db"
                              : "#6b7280"
                            : c.rank === 3
                            ? isDark
                              ? "#fbbf24"
                              : "#f59e42"
                            : isDark
                            ? "#b3b3b3"
                            : "#555"
                      }}
                    >
                      {c.rank}
                    </div>

                    {/* profile */}
                    <div className="profile">
                      <img
                        src={c.avatar}
                        alt={c.username}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          border: `2px solid ${isDark ? "#444" : "#fff"}`,
                          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                          marginRight: 16
                        }}
                      />
                      <div className="info">
                        <a
                          href={c.profile}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontWeight: 500,
                            color: isDark ? "#fff" : "#222",
                            fontSize: 15,
                            textDecoration: "none",
                            marginBottom: 4,
                            display: "block"
                          }}
                        >
                          {c.username}
                        </a>
                        <a
                          href={`https://github.com/${GITHUB_REPO}/pulls?q=is:pr+author:${c.username}+is:merged`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: 13,
                            color: isDark ? "#b3b3b3" : "#555",
                            textDecoration: "none",
                            marginBottom: 4,
                            display: "block",
                            whiteSpace: "nowrap"
                          }}
                          className="view-contributors"
                        >
                          View Contributions →
                        </a>
                      </div>
                    </div>

                    {/* stats */}
                    <div className="states">
                      <div
                        className="state-content"
                        style={{
                          display: "flex",
                          gap: "1.4rem",
                          justifyContent: "center",
                          alignItems: "center",
                          whiteSpace: "nowrap"
                        }}
                      >
                        <Badge
                          count={c.prs}
                          label={`PR${c.prs !== 1 ? "s" : ""}`}
                          color={{
                            background: isDark ? "rgba(59,130,246,0.2)" : "#dbeafe",
                            color: isDark ? "#60a5fa" : "#2563eb"
                          }}
                        />
                        <Badge
                          count={c.points}
                          label="Points"
                          color={{
                            background: isDark ? "rgba(139,92,246,0.2)" : "#ede9fe",
                            color: isDark ? "#a78bfa" : "#7c3aed"
                          }}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* pagination */}
            <div
            className={`flex justify-center items-center gap-2 !py-4 border-t`}
            >
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className={`px-3 py-1 rounded-md text-sm disabled:opacity-50 flex items-center justify-center mt-5`}
                style={currentPage === 1 ? buttonDisabledStyle : buttonStyle}
              >
                <ChevronLeft size={16} />
              </button>
              <div
                style={{
                  display: "flex",
                  justifyContent:'center',
                  gap: 8,   
                }}
              >
                {Array.from({ length: Math.ceil(filtered.length / PAGE_SIZE) }, (_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    style={currentPage === i + 1 ? buttonActiveStyle : buttonStyle}
                     className={`px-3 py-1 rounded w-3 `}
                   
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage((p) => p + 1)}
                style={
                  currentPage === totalPages || totalPages === 0 ? buttonDisabledStyle : buttonStyle
                }
                 className={`px-3 py-1 rounded-md text-sm disabled:opacity-50 flex items-center justify-center mt-5`}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* CTA */}
            <div
              style={{
                padding: "16px 24px",
                textAlign: "center",
                borderTop: `1px solid ${isDark ? "#444" : "#eee"}`,
                background: isDark ? "#23272f" : "#f6f6f6"
              }}
              data-aos="fade-up"
              data-aos-delay="800"
            >
              <p
                style={{
                  fontSize: 14,
                  color: isDark ? "#b3b3b3" : "#555",
                  marginBottom: 12
                }}
              >
                Want to see your name here? Add level labels to your PRs for points!
              </p>
              <a
                href="https://gssoc.girlscript.tech/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "8px 16px",
                  background: isDark ? "#3b82f6" : "#6366f1", // consistent background
                  color: isDark ? "#fff" : "#f1f5f9",
                  fontSize: 15,
                  fontWeight: 500,
                  borderRadius: 8,
                  textDecoration: "none",
                  transition: "background 0.3s ease" // smooth toggle
                }}
              >
                <FaGithub style={{ marginRight: 8 }} />
                Join GSSoC'25
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
