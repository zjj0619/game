#!/bin/bash
# usage: cpimg.sh hash name [hash name ...]
A=/cursor/stores/store-8e29e827-efb8-402a-9baa-a3991232934b/grok-bot/agents/974b4247-35d2-429a-92d7-ed8e904eeb47/attachments
while [ $# -ge 2 ]; do cp $A/$1.jpg /workspace/game/art_raw/$2.jpg && echo "$2 <- $1" >> /workspace/game/art_raw/MANIFEST.txt; shift 2; done
ls /workspace/game/art_raw/*.jpg | wc -l
