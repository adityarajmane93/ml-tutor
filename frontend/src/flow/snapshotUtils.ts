export function sanitizeNodes(
  nodes: any[]
) {

  return nodes.map((node) => {
    const { dataset, ...data } = node.data ?? {};

    return {
      id: node.id,
      type: node.type,
      position: node.position,
      // The data rows are needed only when executing the pipeline. Sending
      // them in every analytics snapshot creates multi-megabyte requests for
      // large CSVs and unnecessarily persists learners' raw data.
      data,
      ...(Array.isArray(dataset)
        ? {
            datasetSummary: {
              rows: dataset.length,
              columns: node.data?.columns?.length ?? 0,
              filename: node.data?.filename ?? "",
            },
          }
        : {}),
    };
  });
}

export function sanitizeEdges(
  edges: any[]
) {

  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
  }));
}
