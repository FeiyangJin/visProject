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
            let dag = prepareGraph(jsonData)
            visualizeDAG(dag, "#svgJSON")
        };

        reader.readAsText(file);
    }
}

function prepareGraph(jsonData){
    let json = JSON.parse(jsonData)
    let nodes = json['nodes']
    let edges = json['links']

    let nodesMap = new Map()
    for (const node of nodes){
        nodesMap.set(node.id, node)
    }

    const builder = d3.graphConnect()
        .sourceId(d => d.source)
        .targetId(d => d.target)
    const dag = builder(edges)

    for(const node of dag.nodes()){
        let id = node.data
        node.data = nodesMap.get(id)
    }
    return dag
}