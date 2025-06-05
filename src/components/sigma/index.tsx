import React, { useRef, useState, useEffect } from "react";
import _ from "lodash";
import Graph from "graphology";
// import { GraphSearch, GraphSearchOption } from "@react-sigma/graph-search";
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
// import { useLayoutForceAtlas2 } from "@react-sigma/layout-forceatlas2";
import "@react-sigma/core/lib/style.css";

import { sigmaData } from "../data";
import { NodeDataType } from "../type";

const sigmaStyle = {
  width: "100%",
  height: "100%",
  border: "1px solid black",
  margin: "auto",
};

// const layoutOptions = {
//   iterations: 50, // 몇 번 계산할지 (값이 클수록 안정적인 형태가 되지만 오래 걸려)
//   settings: {
//     gravity: 1, // 노드들을 중앙으로 모으는 힘
//     linLogMode: true, // 연결이 많은 노드를 더 잘 분리하는 모드
//     // 그 외 다양한 옵션이 있어!
//   },
// };

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
  selectedNode,
  resetFocus,
  onSelect,
}: {
  focusNode: string | null;
  selectedNode: string | null;
  resetFocus: () => void;
  onSelect: (node: string | null) => void;
}) => {
  const clickNodeRef = useRef<string | null>(null);
  const nodeList = useRef<NodeDataType[]>([]);
  const sigma = useSigma();
  const loadGraph = useLoadGraph();
  const registerEvents = useRegisterEvents();
  const { gotoNode } = useCamera();
  // const { assign } = useLayoutForceAtlas2(layoutOptions);

  useEffect(() => {
    loadGraphData(selectedNode);

    if (selectedNode) gotoNode(selectedNode);

    // const graph = sigma.getGraph();

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
      // clickStage: () => {
      //   if (clickNodeRef.current) {
      //     sigma
      //       .getGraph()
      //       .setNodeAttribute(clickNodeRef.current, "highlighted", false);
      //     clickNodeRef.current = null;
      //   }

      //   graph.edges().forEach((edgeId) => {
      //     graph.setEdgeAttribute(edgeId, "color", "rgba(0,0,0,0)");
      //   });

      //   sigma.refresh();
      // },
    });
  }, [selectedNode]);

  useEffect(() => {
    if (!focusNode) return;
    gotoNode(focusNode);

    sigma.getGraph().setNodeAttribute(focusNode, "highlighted", true);

    return () => {
      if (focusNode !== clickNodeRef.current) {
        sigma.getGraph().setNodeAttribute(focusNode, "highlighted", false);
      }
    };
  }, [focusNode]);

  const loadGraphData = (node: string | null) => {
    sigma.clear();

    const graph = new Graph();

    if (!node) {
      const defaultList = sigmaData.filter((item) => item.depth === 0);

      _.sortBy(defaultList, "depth").forEach((item, index) => {
        const angle = (2 * Math.PI * index) / defaultList.length;

        // 삼각함수를 사용하여 x, y 좌표 계산
        // cos(angle)은 x축 방향, sin(angle)은 y축 방향의 단위원 좌표
        const x = 0 + 100 * Math.cos(angle);
        const y = 0 + 100 * Math.sin(angle);

        graph.addNode(item.id, {
          ...item,
          x,
          y,
          size: 10,
          color: depthColor[item.depth],
        });
      });

      // defaultList.forEach((item) => {
      //   item.connects?.forEach((conn) => {
      //     // graph.addEdge(item.id, conn, {
      //     //   size: 5,
      //     //   depth: item.depth,
      //     //   color: depthColor[item.depth],
      //     // });
      //     graph.addEdge(item.id, conn, {
      //       size: 5,
      //       depth: item.depth,
      //       color: "rgba(0,0,0,0)",
      //     });
      //   });
      // });
    } else {
      const parentNode = sigma.getGraph().getNodeAttributes(node);
      const childNodes = sigmaData.filter((item) =>
        item.connects?.includes(node)
      );

      // 기존 노드 추가
      nodeList.current.forEach((item, index) => {
        graph.addNode(item.id, {
          ...item,
          x: item.x,
          y: item.y,
          size: 10,
          color: item.color,
        });

        if (index > 0) {
          graph.addEdge(item.id, nodeList.current[index - 1].id, {
            size: 5,
            depth: item.depth,
          });
        }
      });

      // 부채꼴의 시작 각도와 끝 각도 설정 (라디안)
      const startAngle = -Math.PI * 0.4;
      const endAngle = Math.PI * 0.4;

      // 부채꼴 내에서 노드 배치
      childNodes.forEach((item, index) => {
        // 부채꼴 내에서 균등하게 각도 분배
        const angle =
          startAngle +
          ((endAngle - startAngle) * index) / (childNodes.length - 1 || 1);

        // const xStretchFactor = 2.5; // x축 방향으로 더 많이 늘림
        const radius = (item.depth + 1) * 100;

        // 오프셋 유지하되 추가 X 오프셋 적용
        const offsetX = index % 2 === 0 ? 50 : 150; // 오른쪽으로 150 더 이동

        graph.addNode(item.id, {
          ...item,
          x: parentNode.x + radius * Math.cos(angle) + offsetX,
          y: parentNode.y + radius * Math.sin(angle),
          size: 10,
          color: depthColor[item.depth],
        });

        graph.addEdge(item.id, parentNode.id, {
          size: 5,
          depth: item.depth,
        });
      });
    }

    // function highlightConnectedNodesAndEdges(startNodeId: string) {
    //   const visited = new Set();

    //   function addNodeAndEdges(nodeId: string) {
    //     if (visited.has(nodeId)) return;
    //     visited.add(nodeId);

    //     // 현재 노드 찾기
    //     const node = sigmaData.find((n) => n.id === nodeId);
    //     if (!node) return;

    //     const childNodes = sigmaData.filter((n) =>
    //       n.connects?.includes(nodeId)
    //     );
    //     childNodes.forEach((item) => {
    //       if (!visited.has(item.id)) {
    //         graph.addNode(item.id, {
    //           label: item.label,
    //           size: 10,
    //           depth: item.depth,
    //           color: depthColor[item.depth], // 하이라이트 색상
    //           x: Math.random(), // 위치는 필요에 따라 조정
    //           y: Math.random(),
    //         });
    //       }
    //     });

    //     // 노드 추가
    //     graph.addNode(node.id, {
    //       label: node.label,
    //       size: 10,
    //       depth: node.depth,
    //       color: depthColor[node.depth], // 하이라이트 색상
    //       x: Math.random(), // 위치는 필요에 따라 조정
    //       y: Math.random(),
    //     });

    //     // 연결된 엣지와 노드 추가
    //     if (node.connects) {
    //       node.connects.forEach((connId) => {
    //         // 연결된 노드 재귀적으로 추가
    //         addNodeAndEdges(connId);

    //         // 엣지 추가
    //         graph.addEdge(node.id, connId, {
    //           size: 5,
    //           depth: node.depth,
    //           color: depthColor[node.depth],
    //         });
    //       });
    //     }
    //   }

    //   addNodeAndEdges(startNodeId);
    // }

    // if (node) highlightConnectedNodesAndEdges(node);

    loadGraph(graph);
    // assign();
    sigma.refresh();
  };

  const selectNodeEvent = (node: string) => {
    const graph = sigma.getGraph();

    if (clickNodeRef.current) {
      sigma
        .getGraph()
        .setNodeAttribute(clickNodeRef.current, "highlighted", false);
    }

    clickNodeRef.current = node;
    sigma.getGraph().setNodeAttribute(node, "highlighted", true);

    resetFocus();

    const removeChild = nodeList.current.filter(
      (item) => item.depth < graph.getNodeAttribute(node, "depth")
    );
    const clickNodeObj = {
      ...(graph.getNodeAttributes(node) as NodeDataType),
      id: node,
    };
    nodeList.current = _.unionBy(removeChild, [clickNodeObj], "id");

    onSelect(node === selectedNode && clickNodeObj.depth === 0 ? null : node);
    sigma.refresh();
  };

  return null;
};

const CustomSigma = () => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [focusNode, setFocusNode] = useState<string | null>(null);

  // const onFocus = useCallback((value: GraphSearchOption | null) => {
  //   if (value === null) setFocusNode(null);
  //   else if (value.type === "nodes") setFocusNode(value.id);
  // }, []);
  // const onChange = useCallback((value: GraphSearchOption | null) => {
  //   console.log("!@#!#@!@ onChange", value);
  //   if (value === null) setSelectedNode(null);
  //   else if (value.type === "nodes") setSelectedNode(value.id);
  // }, []);
  // const postSearchResult = useCallback(
  //   (options: GraphSearchOption[]): GraphSearchOption[] => {
  //     return options.length <= 10
  //       ? options
  //       : [
  //           ...options.slice(0, 10),
  //           {
  //             type: "message",
  //             message: (
  //               <span className="text-center text-muted">
  //                 And {options.length - 10} others
  //               </span>
  //             ),
  //           },
  //         ];
  //   },
  //   []
  // );

  return (
    <div style={{ width: "calc(100% - 10%)", height: 1080 }}>
      <SigmaContainer
        id="sigma-container"
        style={sigmaStyle}
        settings={{ autoRescale: false }}
      >
        <LoadGraph
          focusNode={focusNode}
          selectedNode={selectedNode}
          onSelect={(node) => setSelectedNode(node)}
          resetFocus={() => {
            // setSelectedNode(null);
            setFocusNode(null);
          }}
          // move={focusNode ? false : true}
        />
        {/* <ControlsContainer
          position="top-left"
          style={{ width: "50%", minWidth: 330 }}
        >
          <GraphSearch
            type="nodes"
            // value={selectedNode ? { type: "nodes", id: selectedNode } : null}
            onFocus={onFocus}
            onChange={onChange}
            postSearchResult={postSearchResult}
            labels={{
              placeholder: "찾는 노드를 입력해주세요.",
              type_something_to_search: "찾는 노드를 입력해주세요.",
              no_result_found: "입력하신 노드가 없습니다.",
            }}
          />
        </ControlsContainer> */}
        <ControlsContainer position="bottom-right">
          <ZoomControl />
          <FullScreenControl />
        </ControlsContainer>
      </SigmaContainer>
    </div>
  );
};

export default CustomSigma;
