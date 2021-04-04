# -*- mode: ruby -*-
# vi: set ft=ruby :

# Get Mac to forward port 80 to 8080 http://salferrarello.com/mac-pfctl-port-forwarding/

# Vagrantfile API/syntax version. Don't touch unless you know what you're doing!
VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|

    config.vm.box = "ubuntu/trusty64"
    
    #config.vm.box = "hashicorp/precise64"
    #config.vm.box = "hashicorp/bionic64"
    #config.vm.box = "ffuenf/debian-6.0.9-amd64"

    config.vm.network :private_network,
        ip: "10.20.30.40"

    config.vm.network "forwarded_port",
        guest: 3000,
        host: 3000, 
        host_ip: "127.0.0.1"

    config.vm.network "forwarded_port",
        guest: 5000,
        host: 5000,
        host_ip: "127.0.0.1"

    
    config.vm.network "forwarded_port",
        guest: 5001,
        host: 5001,
        host_ip: "127.0.0.1"

    config.vm.synced_folder "./backend", "/opt/dev/backend",
        :nfs => false,
        :create => true

    config.vm.synced_folder "./frontend", "/opt/dev/frontend",
        :nfs => false,
        :create => true

    config.vm.provider :virtualbox do |vb|
        vb.memory = 2048
    end

    config.vm.provision :shell,
        :keep_color => true,
        :path => "vagrant-scripts/provision.sh",
        :privileged => true
end
