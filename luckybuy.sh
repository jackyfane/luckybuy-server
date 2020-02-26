#!/bin/bash
base_dir=$(cd `dirname $0`; pwd)
cd $base_dir
/qyg/app/node/11.12.0-linux-x64/bin/node $base_dir/bin/www >> $base_dir/logs/app.log &

# sudo ln luckybuy.service /etc/systemd/system/luckybuy.service
# 或 sudo cp luckybuy.service /etc/systemd/system/
# sudo systemctl enable luckybuy.service
# sudo systemctl status|start|stop spell_luck
# sudo systemctl disable luckybuy.service
