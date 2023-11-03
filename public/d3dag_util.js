// set the layout functions
const nodeRadius = 15;
const nodeSize = [nodeRadius * 2, nodeRadius * 2];
// this truncates the edges so we can render arrows nicely
const shape = d3.tweakShape(nodeSize, d3.shapeEllipse);

const ompt_device_mem_flag_t = Object.freeze({ 
  to:             0x01,
  from:           0x02,
  alloc:          0x04,
  release:        0x08,
  associate:      0x10,
  disassociate:   0x20
}); 


function get_move_type(flag){
  // notice a flag can contain several types
  let type = ""
  if (flag & ompt_device_mem_flag_t.to){
    type = type + "to | "
  }

  if (flag & ompt_device_mem_flag_t.from){
    type = type + "from | "
  }

  if (flag & ompt_device_mem_flag_t.alloc){
    type = type + "alloc | "
  }

  if (flag & ompt_device_mem_flag_t.release){
    type = type + "release | "
  }

  if (flag & ompt_device_mem_flag_t.associate){
    type = type + "associate | "
  }

  if (flag & ompt_device_mem_flag_t.disassociate){
    type = type + "disassociate | "
  }

  console.log(type)
}


function get_edge_id(e) {
  let id
  if (e.info === undefined){
    id = e.source.data.id + "-->" + e.target.data.id
  }
  else{
    id = e.info.source.data.id + "-->" + e.info.target.data.id
  }
  
  return id
}


function get_edge_dash(e) {
  if(e.data === undefined) {
    return "0"
  }

  if(e.data.edge_type === "FORK_I" || e.data.edge_type === "FORK_E") {
    return "4"
  }

  if(e.data.edge_type === "JOIN" || e.data.edge_type === "JOIN_E" || e.data.edge_type === "BARRIER") {
    return "1,4"
  }

  if (e.data.edge_type === "TARGET") {
    return "20, 10";
  }
}


function get_edge_color(e) {
  if (e.data != undefined && e.data.edge_type === "TARGET"){
    return "pink";
  }
  return "black";
}


function get_edge_width(e) {
  if (e.data != undefined && e.data.edge_type === "TARGET"){
    return 4;
  }
  return 2;
}


function get_edge_type(e) {
  if (e.data != undefined)
  {
    return e.data.edge_type;
  }
  return "NO-TYPE";
}


function get_node_color(n,dag){
  if (n.data.has_race === undefined){
    return "pink"
  }

  if (!n.data.active){
    return "black"
  }

  if (n.data.has_race == true){
    return "red"
  }

  if(n.data.ontarget != undefined && n.data.ontarget == true){
    return "#799CEF"
  }

  return "#F6D42A"
}


function get_node_opacity(n){
  if(n.data.hidden){
    return 0
  }
  return 1
}


function get_edge_opacity(e){
  if(e.data === undefined){
    e.data = new Object()
    e.data.hidden = false
    return "1"
  }

  if(e.data.hidden){
    return "0"
  }

  return "1"
}


let data = [
  {
    id: "0",
    active: true,
    hidden: false,
    parentIds: []
  },
  {
    id: "1",
    active: true,
    hidden: false,
    parentIds: ["0"]
  },
  {
    id: "2",
    active: true,
    hidden: false,
    parentIds: ["0"]
  },
  {
    id: "3",
    active: true,
    hidden: false,
    parentIds: ["1"]
  },
  {
    id: "4",
    active: true,
    hidden: false,
    parentIds: ["1"]
  },
  {
    id: "5",
    active: true,
    hidden: false,
    parentIds: ["2"]
  },
  {
    id: "6",
    active: true,
    hidden: false,
    parentIds: ["2"]
  }
];