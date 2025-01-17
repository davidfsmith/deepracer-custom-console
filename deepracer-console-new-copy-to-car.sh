#!/bin/bash

sudo cp /opt/aws/deepracer/lib/device_console /opt/aws/deepracer/lib/device_console_old
unzip deepracer-console-new.zip -d /temp_website
sudo cp /temp_website/* /opt/aws/deepracer/lib/device_console/templates/ -r