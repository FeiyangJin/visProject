let dag;

document.addEventListener('DOMContentLoaded', () => {
    const json_fileInput = document.getElementById('json_fileInput');
    json_fileInput.addEventListener('change', handleJsonUpload);
});

function handleJsonUpload(event){
    const file = event.target.files[0];
    
    if (file) {
        const reader = new FileReader();

        reader.onload = function (e) {
            let jsonData = e.target.result;

            dag = prepareGraph(jsonData);
            setupSVG("#svgJSON");
            
            const targetMovementData = extractTargetMovementData(jsonData);

            visualizeDAG(dag, "#svgJSON", targetMovementData);
            addLegend();
            prepareDatamove(targetMovementData);
        };

        reader.readAsText(file);
    }
}

function extractTargetMovementData(jsonData) {
    let json = JSON.parse(jsonData);
    let target_regions = json["target"];
    return target_regions ? target_regions : null;
}

let stack = [];

function populateRefCount(node) 
{
    if (stack.includes(node.id)) {
        return;
    }
    stack.push(node.id);
    for (const child of node.children()) 
    {
        ++child.data.refCount;
        populateRefCount(child);
    }
    stack.pop();
}

function prepareGraph(jsonData) {
    let json = JSON.parse(jsonData);
    let nodes = json['nodes'];
    let edges = json['links'];

    let nodesMap = new Map();
    for (const node of nodes) {
        nodesMap.set(node.id, node);
        node.refCount = 0;
    }

    const builder = d3.graphConnect()
        .sourceId(d => d.source)
        .targetId(d => d.target);
    const dag = builder(edges);

    for (const node of dag.nodes()) {
        let id = node.data;
        node.data = nodesMap.get(id);
    }

    for (const node of dag.nodes()) {
        if (node.data.vertex_id === 1)
        {
            node.data.refCount = 1;
        }
        populateRefCount(node);
    }
    stack = [];
    return dag;
}


const radius = 8;
const symbol_x = 20;
const text_x = symbol_x + 4 * radius;
let current_y = symbol_x;
const step_y = 30;

function prepareDatamove(target_regions) {
    /* If graph does not support target regions */
    if (!target_regions) {
        return;
    }

    for (const tr of target_regions) {
        let begin_node = tr["begin_node"];
        let end_node = tr["end_node"];

        let data_movements = tr["datamove"];

        for (const dm of data_movements) {
            let orig_addr = dm["orig_address"];
            get_move_type(dm["flag"]);
        }
    }
}

function addLegend() {
    let legend_svg = d3.select("#legend");

    let existing_ele = legend_svg.select("circle");
    if (!existing_ele.empty()) {
        return;
    }

    {
        legend_svg.append("circle")
        .attr("r", radius)
        .attr("cx", symbol_x)
        .attr("cy", current_y)
        .attr("fill", "#F6D42A");

        legend_svg.append("text")
        .text("node without data race")
        .attr("font-family", "sans-serif")
        .attr("text-anchor", "start")
        .attr("alignment-baseline", "middle")
        .attr("fill", "black")
        .attr("class", "unselectable-text")
        .attr("font-size", "small")
        .attr("x", text_x)
        .attr("y", 20)

        current_y += step_y
    }

    {
        legend_svg.append("circle")
        .attr("r", radius)
        .attr("cx", symbol_x)
        .attr("cy", current_y)
        .attr("fill", "red")

        legend_svg.append("circle")
        .attr("r", radius + 2)
        .attr("cx", symbol_x)
        .attr("cy", current_y)
        .attr("fill", "none")
        .attr("stroke", "blue") // Border color
        .attr("stroke-width", 1.5) // Border width
        .attr("stroke-dasharray", "2,2") // Dash pattern
        .append("animateTransform")
            .attr("attributeName","transform")
            .attr("type","rotate")
            .attr("from", `360 ${symbol_x} ${current_y}`)
            .attr("to", `0 ${symbol_x} ${current_y}`)
            .attr("dur","10s")
            .attr("repeatCount","indefinite");

        legend_svg.append("text")
        .text("node with data race")
        .attr("font-family", "sans-serif")
        .attr("text-anchor", "start")
        .attr("alignment-baseline", "middle")
        .attr("fill", "black")
        .attr("class", "unselectable-text")
        .attr("font-size", "small")
        .attr("x", text_x)
        .attr("y", current_y)

        current_y += step_y
    }


    {
        legend_svg.append("circle")
        .attr("r", radius)
        .attr("cx", symbol_x)
        .attr("cy", current_y)
        .attr("fill", "black")

        legend_svg.append("text")
        .text("collapsed node")
        .attr("font-family", "sans-serif")
        .attr("text-anchor", "start")
        .attr("alignment-baseline", "middle")
        .attr("fill", "black")
        .attr("class", "unselectable-text")
        .attr("font-size", "small")
        .attr("x", text_x)
        .attr("y", current_y)

        current_y += step_y
    }

    {
        legend_svg.append("line")
        .attr("x1", symbol_x - radius)
        .attr("y1", current_y)
        .attr("x2", symbol_x + 2 * radius)
        .attr("y2", current_y)
        .attr("stroke", "black")
        .attr("stroke-width", 2)

        legend_svg.append("text")
        .text("continuation edge")
        .attr("font-family", "sans-serif")
        .attr("text-anchor", "start")
        .attr("alignment-baseline", "middle")
        .attr("fill", "black")
        .attr("class", "unselectable-text")
        .attr("font-size", "small")
        .attr("x", text_x)
        .attr("y", current_y)

        current_y += step_y
    }


    {
        legend_svg.append("line")
        .attr("x1", symbol_x - radius)
        .attr("y1", current_y)
        .attr("x2", symbol_x + 2 * radius)
        .attr("y2", current_y)
        .attr("stroke", "black")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4")

        legend_svg.append("text")
        .text("fork edge")
        .attr("font-family", "sans-serif")
        .attr("text-anchor", "start")
        .attr("alignment-baseline", "middle")
        .attr("fill", "black")
        .attr("class", "unselectable-text")
        .attr("font-size", "small")
        .attr("x", text_x)
        .attr("y", current_y)

        current_y += step_y
    }

    {
        legend_svg.append("line")
        .attr("x1", symbol_x - radius)
        .attr("y1", current_y)
        .attr("x2", symbol_x + 2 * radius)
        .attr("y2", current_y)
        .attr("stroke", "black")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "1,4")

        legend_svg.append("text")
        .text("join edge")
        .attr("font-family", "sans-serif")
        .attr("text-anchor", "start")
        .attr("alignment-baseline", "middle")
        .attr("fill", "black")
        .attr("class", "unselectable-text")
        .attr("font-size", "small")
        .attr("x", text_x)
        .attr("y", current_y)

        current_y += step_y
    }

    {
        legend_svg.append("line")
        .attr("x1", symbol_x - radius)
        .attr("y1", current_y)
        .attr("x2", symbol_x + 2 * radius)
        .attr("y2", current_y)
        .attr("stroke", "pink")
        .attr("stroke-width", 4)

        legend_svg.append("text")
        .text("target edge")
        .attr("font-family", "sans-serif")
        .attr("text-anchor", "start")
        .attr("alignment-baseline", "middle")
        .attr("fill", "black")
        .attr("class", "unselectable-text")
        .attr("font-size", "small")
        .attr("x", text_x)
        .attr("y", current_y)

        current_y += step_y
    }

}