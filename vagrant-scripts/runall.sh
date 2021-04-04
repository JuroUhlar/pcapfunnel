
# Aproach A

# echo "Killing the app if it is currently running..."
sudo killall node &>/dev/null
sudo pkill http-server &>/dev/null

echo "====> Starting the app..."
cd /vagrant/backend/fileServer && node src/index.js &
cd /vagrant/backend/geolocation && node index.js &
sudo http-server /vagrant/frontend/build/ -p 3000 &


# Approach B, does not fix the runall bug

# Next try launching the exact file without changing folders

# echo "Killing the app if it is currently running"
# pm2 kill

# echo "Starting the app"
# cd /vagrant/backend/fileServer && pm2 start ./src/index.js
# cd /vagrant/backend/geolocation && pm2 start ./index.js
# sudo pm2 serve /vagrant/frontend/build/ 3000 --spa