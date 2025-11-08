# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/jammy64"
  config.vm.synced_folder '.', '/home/vagrant/wireguard-connect-simulator', mount_options: ["dmode=775", "fmode=775"], rsync__exclude: [".git/"]

  # Common provisioning for both machines
  common_provision = <<-SHELL
    set -e
    sudo apt-get update
    sudo apt-get install -y curl git build-essential wireguard iperf3

    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs

    cd /home/vagrant/wireguard-connect-simulator
    npm install
  SHELL

  config.vm.define "machineA" do |machine|
    machine.vm.hostname = "machineA"
    machine.vm.network "private_network", ip: "192.168.56.10"
    machine.vm.provision "shell", inline: common_provision
    machine.vm.provision "shell", inline: <<-SHELL, privileged: false
      cd /home/vagrant/wireguard-connect-simulator
      if ! command -v pm2 >/dev/null 2>&1; then
        sudo npm install -g pm2
      fi
      pm2 start npm --name frontend -- run start-frontend -- --host 0.0.0.0
      pm2 start npm --name backend -- run start-backend
    SHELL
  end

  config.vm.define "machineB" do |machine|
    machine.vm.hostname = "machineB"
    machine.vm.network "private_network", ip: "192.168.56.11"
    machine.vm.provision "shell", inline: common_provision
    machine.vm.provision "shell", inline: <<-SHELL, privileged: false
      cd /home/vagrant/wireguard-connect-simulator
      if ! command -v pm2 >/dev/null 2>&1; then
        sudo npm install -g pm2
      fi
      pm2 start npm --name frontend -- run start-frontend -- --host 0.0.0.0
      pm2 start npm --name backend -- run start-backend
    SHELL
  end
end
