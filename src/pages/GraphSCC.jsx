import React, { useEffect, useRef, useState } from "react";
import Graph from "react-vis-network-graph";
import "aos/dist/aos.css";
import "../styles/graphSCC.css";
import { Network } from "vis-network/standalone";
import "vis-network/styles/vis-network.css";
import { useTheme } from "../ThemeContext";
import { sccDetection } from "../data/allCodes";

const graph = {
  nodes: [
    { id: 1, label: "1" },
    { id: 2, label: "2" },
    { id: 3, label: "3" },
    { id: 4, label: "4" },
    { id: 5, label: "5" }
  ],
  edges: [
    { id: "1-2", from: 1, to: 2 },
    { id: "2-3", from: 2, to: 3 },
    { id: "2-4", from: 2, to: 4 },
    { id: "4-5", from: 4, to: 5 },
    { id: "5-1", from: 5, to: 1 }
  ]
};
const options = {
  nodes: {
    shape: "circle",
    color: "#476DEB",
    font: { color: "#fff", size: 40, bold: true },
    borderWidth: 2
  },
  edges: {
    color: { color: "#aaa" },
    width: 2,
    smooth: {
      type: "dynamic" // ✅ makes edges animate smoothly
    },
    arrows: {
      to: { enabled: true, scaleFactor: 1.1 } // ✅ adds directed arrow
    }
  },
  physics: {
    enabled: true,
    stabilization: { iterations: 200 },
    barnesHut: { gravitationalConstant: -4000 } // makes nodes float & move
  },
  interaction: { hover: true, dragNodes: true }
};

const GraphVisulizer = () => {
  const mainGraphRef = useRef(null);
  const dagRef = useRef(null);
  const [mainNetwork, setMainNetwork] = useState(null);
  const [sccData, setSccData] = useState([]);
  const [running, setRunning] = useState(false);

  // Initialize main graph
  useEffect(() => {
    if (mainGraphRef.current && !mainNetwork) {
      const net = new Network(mainGraphRef.current, graph, options);
      setMainNetwork(net);
    }
  }, [mainNetwork]);

  // Utility sleep for animation
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  // ---------- Kosaraju’s Algorithm (Animated) ----------
  const animateSCC = async () => {
    if (!mainNetwork || running) return;
    setRunning(true);
    setSccData([]);

    const adj = new Map();
    const rev = new Map();
    graph.nodes.forEach((n) => {
      adj.set(n.id, []);
      rev.set(n.id, []);
    });
    graph.edges.forEach((e) => {
      adj.get(e.from).push(e.to);
      rev.get(e.to).push(e.from);
    });

    const visited = new Set();
    const stack = [];
    const colors = ["#FF6B6B", "#4ECDC4", "#FFD93D", "#6A5ACD", "#FFA500", "#00C49F"];

    const highlightNode = async (id, color = "#FFD93D") => {
      mainNetwork.body.data.nodes.update({ id, color });
      await sleep(400);
    };

    const resetNodeColor = (id) => {
      mainNetwork.body.data.nodes.update({ id, color: "#476DEB" });
    };

    // Step 1: DFS fill order
    const dfs1 = async (v) => {
      visited.add(v);
      await highlightNode(v);
      for (const nei of adj.get(v)) {
        if (!visited.has(nei)) await dfs1(nei);
      }
      stack.push(v);
      await highlightNode(v, "#6A5ACD"); // finished node
    };

    for (const n of graph.nodes) {
      if (!visited.has(n.id)) await dfs1(n.id);
    }

    // Reset color
    graph.nodes.forEach((n) => resetNodeColor(n.id));
    await sleep(800);

    // Step 2: DFS on reversed graph
    const visited2 = new Set();
    const sccs = [];

    const dfs2 = async (v, comp, color) => {
      visited2.add(v);
      comp.push(v);
      await highlightNode(v, color);
      for (const nei of rev.get(v)) {
        if (!visited2.has(nei)) await dfs2(nei, comp, color);
      }
    };

    while (stack.length) {
      const v = stack.pop();
      if (!visited2.has(v)) {
        const comp = [];
        const color = colors[sccs.length % colors.length];
        await dfs2(v, comp, color);
        sccs.push(comp);
        await sleep(800);
      }
    }

    console.log("SCCs found:", sccs);
    setSccData(sccs);
    setRunning(false);
    drawCondensedGraph(sccs);
  };

  return (
    <div className="theme-card flex flex-col items-center !my-6">
      <h2 className="text-3xl font-bold mb-4">
        🧩 Strongly Connected Components (SCC) Visualization
      </h2>

      {/* Main Graph */}
      <div
        className="w-full sm:w-[90%] md:w-[60%] lg:w-[50%] h-[500px] md:h-[500px]"
        ref={mainGraphRef}
        style={{
          border: "2px solid var(--text-muted)",
          borderRadius: "10px",
          marginBottom: "20px"
        }}
      ></div>

      {/* Buttons */}
      <button
        onClick={animateSCC}
        disabled={running}
        className={`px-6 py-2 rounded-lg font-semibold text-lg transition ${
          running ? "bg-gray-600 cursor-not-allowed" : "bg-green-500 hover:bg-green-600"
        }`}
      >
        {running ? "Running..." : "Run SCC Animation"}
      </button>

      {/* SCC Info Panel */}
      <div className="flex justify-between items-center">
        {sccData.length > 0 && (
          <div className="!mt-6 text-left !p-5 rounded-lg border-2 shadow-2xl">
            <h3 className="text-2xl font-semibold mb-2">🔹 SCC Summary</h3>
            <p className="text-lg mb-3">
              Total Components Found :{" "}
              <span className="font-bold text-green-400 !pl-2">{sccData.length}</span>
            </p>
            <ul className="list-disc !px-6 !py-4 space-y-1">
              {sccData.map((comp, i) => (
                <li key={i}>
                  <span className="font-bold text-yellow-400">SCC {i + 1}:</span> [{comp.join(", ")}
                  ]
                </li>
              ))}
            </ul>
            <p>Highlights nodes live:</p>
            <ul>
              <li> 🟡 Yellow → visiting </li>
              <li>🟣 Purple → finished (pushed to stack)</li>
              <li>✅ Then colors each SCC group with a different color</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

const GraphSCC = () => {
  const [selectedLanguage, setSelectedLanguage] = useState("java");
  const [algo, setAlgo] = useState("");
  return (
    <div className="theme-container opacity-90" data-aos="fade-up" data-aos-duration="1000">
      <h1 className="theme-title">Strongly Connected Component</h1>
      <p
        style={{
          textAlign: "center",
          maxWidth: "700px",
          margin: "1px auto 2rem auto",
          color: "var(--theme-text-secondary)",
          lineHeight: "1.5",
          letterSpacing: "2px"
        }}
      >
        In a directed graph, a Strongly Connected Component (SCC) is a maximal subgraph in which
        every vertex is reachable from every other vertex.
      </p>
      {/* explaination about scc */}
      <div
        className="theme-card"
        data-aos="fade-up"
        data-aos-duration="900"
        style={{ marginBottom: "2rem" }}
      >
        <div className="theme-card-header">
          <h3>Let's Understand using Example</h3>
        </div>
        <div className="example">
          <div className="show-graph">
            <h2>🔹 SCC in Directed Graph</h2>
            <Graph
              graph={graph}
              options={options}
              className="w-full sm:w-[90%] md:w-[60%] lg:w-[50%] h-[500px] md:h-[500px] border-3 border-gray-200 rounded-2xl"
            />
          </div>
          <div className="explanation">
            <p>Here:</p>
            <ul>
              <li>
                From 1, you can go to 2, then 3, but you can’t return to 1 from 3. ⇒{" "}
                {`[${[1, 2, 3, 4, 5].join(", ")}]`} is not one big SCC.
              </li>
            </ul>
            <p>But if we analyze parts:</p>
            <ul>
              <li>
                {`[${[1, 2, 5, 4].join(", ")}]`} form a cycle: you can reach each other (1→2→4→5→1).
                ✅
              </li>
              <li>3 is isolated in terms of strong connectivity.</li>
            </ul>
            <p>So SCC's are:</p>
            <ul>
              <li>[1,2,4,5]</li>
              <li>[3]</li>
            </ul>
          </div>
        </div>
        <div className="undirected">
          <h2>🔹 SCC in Undirected Graph</h2>
          <p>
            In an undirected graph, every connected component is trivially an SCC — because every
            edge can be traversed in both directions.
          </p>
        </div>
      </div>
      {/* why card */}
      <div
        className="theme-card important"
        data-aos="fade-up"
        data-aos-duration="800"
        style={{ marginBottom: "2rem" }}
      >
        <h2>🔹 Why SCCs are Important</h2>
        <ul>
          <li>Detecting cycles in directed graphs </li>
          <li>Condensing graphs (each SCC becomes one node — forms a DAG)</li>
          <li>Topological sorting of strongly connected components </li>
          <li>Finding deadlocks in systems</li>
          <li>Optimizing compilers (control flow analysis) </li>
          <li>Social network analysis (groups of mutual followers)</li>
        </ul>
      </div>
      {/* algorithm */}
      <div className="theme-card !mb-6" data-aos="fade-up" data-aos-duration="700">
        <h2>Two Common Algo for SCC:</h2>
        {/* first algo */}
        <div
          className="rounded-xl border border-gray-200 flex flex-col !mb-6 !px-5 !py-4 algo"
          data-aos="fade-up"
          data-aos-duration="500"
        >
          <h2 className="text-xl font-semibold mb-3 text-indigo-500">⚙️ Kosaraju’s Algorithm</h2>
          <p className="mb-2 px-4 py-6">
            <span style={{ fontSize: "1.5rem" }}>Idea:</span> Perform{" "}
            <strong>two DFS traversals</strong> to find SCCs.
          </p>
          <h3 className="font-semibold text-xl">Steps:</h3>
          <div class="flex justify-center items-stretch flex-wrap gap-4 !p-4">
            <div className="bg-blue-800 border border-blue-400 rounded-xl !p-2 text-center shadow-lg shadow-blue-500/50 transition-transform duration-300 hover:scale-105 hover:bg-blue-900 flex-1 min-w-[150px]">
              <h3 className=" !text-white">1 DFS (Forward):</h3>
              <ol className="list-decimal list-inside space-y-1 mb-3 flex flex-col justify-center items-start">
                <li className=" !text-gray-200">Perform DFS on the original graph.</li>
                <li className=" !text-gray-200">Push each vertex to a stack when finished.</li>
              </ol>
            </div>
            <div className="bg-blue-800 border border-blue-400 rounded-xl !p-2 text-center shadow-lg shadow-blue-500/50 transition-transform duration-300 hover:scale-105 hover:bg-blue-900 flex-1 min-w-[150px]">
              <h3 className=" !text-white">2 Reverse Graph: </h3>
              <ol className="list-decimal list-inside space-y-1 mb-3 flex flex-col justify-center items-start">
                <li className=" !text-gray-200">Reverse the direction of all edges.</li>
              </ol>
            </div>
            <div className="bg-blue-800 border border-blue-400 rounded-xl !p-2 text-center shadow-lg shadow-blue-500/50 transition-transform duration-300 hover:scale-105 hover:bg-blue-900 flex-1 min-w-[150px]">
              <h3 className=" !text-white">DFS (Reverse):</h3>
              <ol className="list-decimal list-inside space-y-1 mb-3 flex flex-col justify-center items-start">
                <li className=" !text-gray-200">Pop vertices one by one from the stack.</li>
                <li className=" !text-gray-200">Perform DFS on the reversed graph. </li>
                <li className=" !text-gray-200">Each DFS tree = one SCC.</li>
              </ol>
            </div>
          </div>
          <p>
            <span style={{ fontSize: "1.4rem" }}>
              {" "}
              <strong>Time Complexity:</strong>
            </span>{" "}
            O(V + E)
          </p>
        </div>
        {/* second algo */}
        <div
          className="p-4 rounded-xl border border-gray-200 flex flex-col mx-4 my-6 !px-5 !py-4 algo"
          data-aos="fade-up"
          data-aos-duration="400"
        >
          <h2 className="text-xl font-semibold mb-3 text-indigo-500">⚙️ Tarjan’s Algorithm</h2>
          <p className="mb-2 px-4 py-6">
            <span style={{ fontSize: "1.5rem" }}>Idea:</span> Use a single DFS and two arrays to
            track reachability.
          </p>
          <div className="flex justify-center items-stretch flex-wrap gap-4 !p-4">
            <div className="bg-blue-800 border border-blue-400 rounded-xl !p-2 text-center shadow-lg shadow-blue-500/50 transition-transform duration-300 hover:scale-105 hover:bg-blue-900 flex-1 min-w-[150px]">
              <h3 className=" !text-white">🔸 Key Concepts</h3>
              <ol className="list-decimal list-inside space-y-1 mb-3 !px-2 flex flex-col justify-center items-start">
                <li className=" !text-gray-200">disc[v]: Discovery time of vertex v</li>
                <li className=" !text-gray-200">low[v]: Lowest discovery time reachable from v</li>
              </ol>
            </div>
            <div className="bg-blue-800 border border-blue-400 rounded-xl !p-2 text-center shadow-lg shadow-blue-500/50 transition-transform duration-300 hover:scale-105 hover:bg-blue-900 flex-1 min-w-[150px]">
              <h3 className=" !text-white">🔸 Steps</h3>
              <ol className="list-decimal list-inside space-y-1 mb-3 !px-2 flex flex-col justify-center items-start !text-white">
                <li className=" !text-gray-200">Perform a DFS traversal.</li>
                <li className=" !text-gray-200">Update low[v] for each vertex.</li>
                <li className=" !text-gray-200">
                  If disc[v] == low[v], then v is the root of an SCC
                </li>
                <li className=" !text-gray-200">
                  Pop vertices from the stack until v is reached → forms one SC
                </li>
              </ol>
            </div>
          </div>
          <p>
            <span style={{ fontSize: "1.4rem" }}>
              {" "}
              <strong>Time Complexity:</strong>
            </span>{" "}
            O(V + E)
          </p>
        </div>

        {/* summary card */}
        <h3 style={{ fontSize: "2rem", color: "var(--text-primary)" }}>🧠 Summary</h3>
        <div className="overflow-x-auto mt-4 summary" data-aos="fade-up" data-aos-duration="300">
          <table className="w-full border border-gray-300 rounded-lg">
            <thead>
              <tr>
                <th className="p-2 border">Algorithm</th>
                <th className="p-2 border">DFS Used</th>
                <th className="p-2 border">Reversal Needed</th>
                <th className="p-2 border">Time Complexity</th>
                <th className="p-2 border">Space</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border">Kosaraju’s</td>
                <td className="p-2 border">2 times</td>
                <td className="p-2 border text-green-500">✅ Yes</td>
                <td className="p-2 border">O(V + E)</td>
                <td className="p-2 border">O(V)</td>
              </tr>
              <tr>
                <td className="p-2 border">Tarjan’s</td>
                <td className="p-2 border">1 time</td>
                <td className="p-2 border text-red-500">❌ No</td>
                <td className="p-2 border">O(V + E)</td>
                <td className="p-2 border">O(V)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* visulization card */}
      <div className="flex items-center justify-center" data-aos="fade-up" data-aos-delay="200">
        <GraphVisulizer />
      </div>

      {/* code implementation for scc using Kosaraju’s algo */}
      <div
        className="theme-card"
        style={{ marginTop: "2rem" }}
        data-aos="fade-up"
        data-aos-delay="100"
      >
        <div className="theme-card-header">
          <h3>SCC code using Kosaraju’s Algorithm</h3>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {["java", "python", "cpp", "javascript", "go"].map((lang) => (
              <button
                key={lang}
                className={`btn ${selectedLanguage === lang ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setSelectedLanguage(lang)}
                style={{ fontSize: "0.9rem", padding: "0.5rem 1rem" }}
              >
                {lang.charAt(0).toUpperCase() + lang.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            background: "var(--surface-bg)",
            borderRadius: "8px",
            padding: "1.2rem",
            overflow: "auto",
            maxHeight: "500px",
            marginLeft: "1rem",
            display: "flex",
            flexDirection: "column",
            justifyContent:'center',
            gap: "1rem"
          }}
        >
          <div style={{
            display:'flex',
            gap:'1rem',
            justifyContent:'center',
            alignItems:'center',
          }}>
            <label style={{ marginRight: "5px", marginBottom: "1rem" }}>Algorithm:</label>
            <select
              value={algo}
              onChange={(e) => setAlgo(e.target.value)}
              style={{ marginBottom: "1rem" }}
            >
              <option value="BFS">BFS</option>
              <option value="DFS">DFS</option>
            </select>
          </div>
          <pre
            style={{
              margin: 0,
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              fontSize: "0.9rem",
              lineHeight: "1.5",
              color: "var(--text-primary)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word"
            }}
          >
            <code>
              {(algo === "BFS"
                ? sccDetection.bfs[selectedLanguage]
                : sccDetection.dfs[selectedLanguage]) ||
                `// ${algo} implementation for graph in ${selectedLanguage.toUpperCase()} coming soon!
          `}
            </code>
          </pre>
        </div>
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            background: "var(--accent-warning-bg)",
            borderRadius: "6px",
            fontSize: "0.9rem",
            color: "var(--text-secondary)"
          }}
        >
          <strong>Note:</strong> This is the actual implementation code for Depth-First Search in{" "}
          {selectedLanguage.toUpperCase()}. You can copy and use this code in your projects.
        </div>
      </div>
    </div>
  );
};

export default GraphSCC;
