#!/usr/bin/env python
# coding: utf-8

# In[31]:


import networkx as nx
from networkx.readwrite import json_graph

import json
from datetime import datetime
import os
import subprocess


# In[32]:


format_data = "%y%m%d-%H%M%S"
x = datetime.now()
time = x.strftime(format_data)
filename = f'output{time}.json'

dataDir = "data"
outputfile = os.path.join(dataDir, filename)
inputfile = os.path.join(dataDir, "oct15.graphml")

def write_to_file(path: str, content:str):
    with open(path, 'w') as f:
        f.write(content)
    return


def run_cmd(cmd: str, dir: str):
    # Use subprocess.Popen to run the command and capture output
    process = subprocess.Popen(
        cmd,
        cwd=dir,
        shell=True,  # Allows running commands with shell features like pipes (use with caution)
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True  # For working with text output
    )

    # Wait for the command to complete and capture stdout and stderr
    stdout, stderr = process.communicate()

    # Check the return code to see if the command was successful
    return_code = process.returncode
    
    return stdout, stderr, return_code


# In[33]:


cmd = "dir"
dir = os.getcwd()
out, err, code = run_cmd(cmd, dir)


# In[34]:


G = nx.read_graphml(inputfile)

# Find and remove nodes with attribute "vertex_id" equal to 0
nodes_to_remove = [node for node, data in G.nodes(data=True) if data.get('vertex_id') == 0]
G.remove_nodes_from(nodes_to_remove)

print(nx.is_directed_acyclic_graph(G))


# In[35]:


data = json_graph.node_link_data(G)

for node in data['nodes']:
    node["active"] = True
    node["hidden"] = False

for edge in data['links']:
    edge["hidden"] = False


# In[36]:


jsonData = json.dumps(data, indent=4)

write_to_file(outputfile, jsonData)
print(f'Conversion completed. JSON file saved as {outputfile}')


# In[ ]:




