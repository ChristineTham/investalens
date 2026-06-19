"use client";

interface DendrogramProps {
  linkage: number[][];
  labels: string[];
}

export function Dendrogram({ linkage, labels }: DendrogramProps) {
  const n = labels.length;
  if (n === 0 || linkage.length === 0) return null;

  // Render a simple text-based dendrogram (full D3 dendrogram is complex)
  // Each linkage row: [cluster1, cluster2, distance, count]
  const mergeOrder: string[] = [];
  const clusters: Record<number, string[]> = {};

  // Initialize leaf clusters
  for (let i = 0; i < n; i++) {
    clusters[i] = [labels[i]];
  }

  for (let i = 0; i < linkage.length; i++) {
    const [a, b, dist] = linkage[i];
    const clusterA = clusters[a] || [`Cluster ${a}`];
    const clusterB = clusters[b] || [`Cluster ${b}`];
    clusters[n + i] = [...clusterA, ...clusterB];
    mergeOrder.push(
      `${clusterA.join(",")} + ${clusterB.join(",")} (dist: ${dist.toFixed(3)})`
    );
  }

  // Show clustering order as a table
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {labels.map((label, i) => (
          <span
            key={label}
            className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium"
          >
            {label}
          </span>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-2">Step</th>
              <th className="p-2">Merge</th>
            </tr>
          </thead>
          <tbody>
            {mergeOrder.map((merge, i) => (
              <tr key={i} className="border-b">
                <td className="p-2 text-muted-foreground">{i + 1}</td>
                <td className="p-2 font-mono text-xs">{merge}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
