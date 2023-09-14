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
            prepareGraph(jsonData)
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
        nodesMap[node.id] = node
    }

    const linkdata = edges.map(edge => ({
        source: nodesMap[edge.source],
        target: nodesMap[edge.target]
    }));

    const builder = d3.graphConnect()
        .sourceId(d => d.source.id)
        .targetId(d => d.target.id)

    const dag = builder(linkdata)
    
    visualizeDAG(dag)
}