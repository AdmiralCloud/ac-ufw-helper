# AC UFW Helper
This little helper collects IP addresses (e.g. from Pingdom) and adds them to a text list. 

These lists can then be used to update UFW with these IPs (= give them access to port 443).

You can also put private IP lists into a folder. 

Within the list you can use comments and plain IP addresses.

```
# Google IP
8.8.8.8
```

# Installation
Install node and the required packages with npm i --production.

Create a folder privateIPLists and put your personal IP lists in there.

# Usage

## Collect IPs
Use node pingdomIPs.js to collect Pingdom IPs.

## Update UFW
Update UFW using node updateUfw.js. 

Option  "dry run"
```
node updateUfw.js --dry-run
```

Attention - during the process all existing rules for port 443 are deleted. Make sure to add your personal IP with access to all ports (anywhere) or any other port than only 443.