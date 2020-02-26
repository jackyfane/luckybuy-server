#!/bin/bash
base_dir=$(cd `dirname $0`; pwd)
nohup npm start >> $base_dir/logs/app.log &

# sudo ln luckybuy.service /etc/systemd/system/luckybuy.service
# 或 sudo cp luckybuy.service /etc/systemd/system/
# sudo systemctl enable luckybuy.service
# systemctl status spell_luck
# sudo systemctl disable luckybuy.service