# https://stackoverflow.com/questions/22523134/running-remote-commands-after-vagrant-ssh

vagrant up
vagrant ssh -- -t 'runall; /bin/bash'