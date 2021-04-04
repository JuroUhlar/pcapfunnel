

# blue=$(tput setaf 4)
# normal=$(tput sgr0)

# printf "%40s\n" "${blue}This text is blue${normal}"

### Update the system
sudo apt-get update

# Make /opt directory owned by vagrant user
sudo chown vagrant:vagrant /opt/
sudo chown -R vagrant /opt

echo "Installing Node.js"
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo apt-get install -y build-essential
sudo apt-get install -y dos2unix

echo "Installing Tshark"

#Try to allow root to run wireshark, does not help
echo "wireshark-common wireshark-common/install-setuid boolean true" | sudo debconf-set-selections

export DEBIAN_FRONTEND=noninteractive
sudo dpkg --configure -a # fix to some bug
sudo apt-get install -y tshark > /dev/null

echo "Installing yarn, http-server, pm2, serve"
sudo npm install http-server -g
sudo npm install yarn -g
sudo npm install serve -g
sudo npm install pm2 -g

# Move runall.sh script to path as 'runall'
export PATH=$PATH:~/bin
sudo cp /vagrant/vagrant-scripts/runall.sh /bin
sudo mv /bin/runall.sh /bin/runall
sudo dos2unix /bin/runall

# cd /opt/dev/backend/ && node index.js &

. /vagrant/vagrant-scripts/install_npm_dependencies.sh
# . /vagrant/vagrant-scripts/runall.sh

# printf "Your app should now be running on port 3000."
echo "======> Your VM should be ready now"
echo "======> Run 'vagrant ssh' to login"
echo "======> Run 'runall' to start the app"
