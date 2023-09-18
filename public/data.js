// set the layout functions
const nodeRadius = 15;
const nodeSize = [nodeRadius * 2, nodeRadius * 2];
// this truncates the edges so we can render arrows nicely
const shape = d3.tweakShape(nodeSize, d3.shapeEllipse);

let data = [
    {
      id: "0",
      active: true,
      parentIds: ["8"]
    },
    {
      id: "1",
      active: true,
      parentIds: []
    },
    {
      id: "2",
      active: true,
      parentIds: []
    },
    {
      id: "3",
      active: true,
      parentIds: ["11"]
    },
    {
      id: "4",
      active: true,
      parentIds: ["12"]
    },
    {
      id: "5",
      active: true,
      parentIds: ["18"]
    },
    {
      id: "6",
      active: true,
      parentIds: ["9", "15", "17"]
    },
    {
      id: "7",
      active: true,
      parentIds: ["3", "17", "20", "21"]
    },
    {
      id: "8",
      active: true,
      parentIds: []
    },
    {
      id: "9",
      active: true,
      parentIds: ["4"]
    },
    {
      id: "10",
      active: true,
      parentIds: ["16", "21"]
    },
    {
      id: "11",
      active: true,
      parentIds: ["2"]
    },
    {
      id: "12",
      active: true,
      parentIds: ["21"]
    },
    {
      id: "13",
      active: true,
      parentIds: ["4", "12"]
    },
    {
      id: "14",
      active: true,
      parentIds: ["1", "8"]
    },
    {
      id: "15",
      active: true,
      parentIds: []
    },
    {
      id: "16",
      active: true,
      parentIds: ["0"]
    },
    {
      id: "17",
      active: true,
      parentIds: ["19"]
    },
    {
      id: "18",
      active: true,
      parentIds: ["9"]
    },
    {
      id: "19",
      active: true,
      parentIds: []
    },
    {
      id: "20",
      active: true,
      parentIds: ["13"]
    },
    {
      id: "21",
      active: true,
      parentIds: []
    }
  ];