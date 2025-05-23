import React, { useRef, useState, useEffect, useCallback } from "react";
import _ from "lodash";
import Graph from "graphology";
import { GraphSearch, GraphSearchOption } from "@react-sigma/graph-search";
import {
  ControlsContainer,
  FullScreenControl,
  SigmaContainer,
  useCamera,
  useLoadGraph,
  useRegisterEvents,
  useSigma,
  ZoomControl,
} from "@react-sigma/core";
import { useLayoutForceAtlas2 } from "@react-sigma/layout-forceatlas2";
import "@react-sigma/core/lib/style.css";

import { sigmaData } from "../data";

const sigmaStyle = {
  height: "1000px",
  width: "1900px",
  border: "1px solid black",
  margin: "auto",
};

const layoutOptions = {
  iterations: 50, // 몇 번 계산할지 (값이 클수록 안정적인 형태가 되지만 오래 걸려)
  settings: {
    gravity: 1, // 노드들을 중앙으로 모으는 힘
    linLogMode: true, // 연결이 많은 노드를 더 잘 분리하는 모드
    // 그 외 다양한 옵션이 있어!
  },
};

const depthColor = ["#ff0000", "#ff8c00", "#ffff00", "#008000", "#0000ff"];
// const depthColor = [
//   "rgba(255,0,0,1)",
//   "rgba(255,140,0,1)",
//   "rgba(255,255,0,1)",
//   "rgba(0,128,0,1)",
//   "rgba(0,0,255,1)",
// ];

export const LoadGraph = ({
  focusNode,
  resetFocus,
  move,
}: {
  focusNode: string | null;
  resetFocus: () => void;
  move: boolean;
}) => {
  const clickNodeRef = useRef<string | null>(null);
  const sigma = useSigma();
  const loadGraph = useLoadGraph();
  const registerEvents = useRegisterEvents();
  const { gotoNode } = useCamera();
  const { assign } = useLayoutForceAtlas2(layoutOptions);

  useEffect(() => {
    if (!focusNode) return;
    if (move) {
      gotoNode(focusNode);
      selectNodeEvent(focusNode);
    }
    sigma.getGraph().setNodeAttribute(focusNode, "highlighted", true);

    return () => {
      if (focusNode !== clickNodeRef.current) {
        sigma.getGraph().setNodeAttribute(focusNode, "highlighted", false);
      }
    };
  }, [focusNode, move]);

  useEffect(() => {
    const graph = new Graph();

    _.sortBy(sigmaData, "depth").forEach((item) => {
      graph.addNode(item.id, {
        x: item.depth === 0 ? 0 : Math.random() * 1,
        y: item.depth === 0 ? 0 : Math.random() * 1,
        label: item.label,
        size: 10,
        color: depthColor[item.depth],
      });
    });

    sigmaData.forEach((item) => {
      item.connects?.forEach((conn) => {
        // graph.addEdge(item.id, conn, {
        //   size: 5,
        //   depth: item.depth,
        //   color: depthColor[item.depth],
        // });
        graph.addEdge(item.id, conn, {
          size: 5,
          depth: item.depth,
          color: "rgba(0,0,0,0)",
        });
      });
    });

    loadGraph(graph);
    assign();

    const container = document.getElementById("sigma-container"); // SigmaContainer가 렌더링되는 DOM 요소의 ID
    if (!container) return; // 요소 없으면 그냥 리턴

    registerEvents({
      enterNode: () => {
        container.style.cursor = "pointer";
      },
      leaveNode: () => {
        container.style.cursor = "default";
      },
      clickNode: (event) => selectNodeEvent(event.node),
      clickStage: () => {
        if (clickNodeRef.current) {
          sigma
            .getGraph()
            .setNodeAttribute(clickNodeRef.current, "highlighted", false);
          clickNodeRef.current = null;
        }

        graph.edges().forEach((edgeId) => {
          graph.setEdgeAttribute(edgeId, "color", "rgba(0,0,0,0)");
        });

        sigma.refresh();
      },
    });
  }, []);

  const selectNodeEvent = (node: string) => {
    const graph = sigma.getGraph();
    graph.edges().forEach((edgeId) => {
      graph.setEdgeAttribute(edgeId, "color", "rgba(0,0,0,0)");
    });

    graph.edges(node).forEach((edgeId) => {
      const edge = graph.getEdgeAttributes(edgeId);

      graph.setEdgeAttribute(edgeId, "color", depthColor[edge.depth]);
    });

    if (clickNodeRef.current) {
      sigma
        .getGraph()
        .setNodeAttribute(clickNodeRef.current, "highlighted", false);
    }

    clickNodeRef.current = node;
    sigma.getGraph().setNodeAttribute(node, "highlighted", true);

    resetFocus();

    sigma.refresh();
  };
  return null;
};

const CustomSigma = () => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [focusNode, setFocusNode] = useState<string | null>(null);

  const onFocus = useCallback((value: GraphSearchOption | null) => {
    if (value === null) setFocusNode(null);
    else if (value.type === "nodes") setFocusNode(value.id);
  }, []);
  const onChange = useCallback((value: GraphSearchOption | null) => {
    if (value === null) setSelectedNode(null);
    else if (value.type === "nodes") setSelectedNode(value.id);
  }, []);
  const postSearchResult = useCallback(
    (options: GraphSearchOption[]): GraphSearchOption[] => {
      return options.length <= 10
        ? options
        : [
            ...options.slice(0, 10),
            {
              type: "message",
              message: (
                <span className="text-center text-muted">
                  And {options.length - 10} others
                </span>
              ),
            },
          ];
    },
    []
  );

  return (
    <div>
      <SigmaContainer
        id="sigma-container"
        style={sigmaStyle}
        settings={{ allowInvalidContainer: true }}
      >
        <LoadGraph
          focusNode={focusNode ?? selectedNode}
          resetFocus={() => {
            setSelectedNode(null);
            setFocusNode(null);
          }}
          move={focusNode ? false : true}
        />
        <ControlsContainer position="top-right" style={{ width: 500 }}>
          <GraphSearch
            type="nodes"
            value={selectedNode ? { type: "nodes", id: selectedNode } : null}
            onFocus={onFocus}
            onChange={onChange}
            postSearchResult={postSearchResult}
            labels={{
              placeholder: "찾는 노드를 입력해주세요.",
              type_something_to_search: "찾는 노드를 입력해주세요.",
              no_result_found: "입력하신 노드가 없습니다.",
            }}
          />
        </ControlsContainer>
        <ControlsContainer position="bottom-right">
          <ZoomControl />
          <FullScreenControl />
        </ControlsContainer>
      </SigmaContainer>
    </div>
  );
};

export default CustomSigma;
