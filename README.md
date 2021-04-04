# PCAPFunnel

The goal of this master thesis project is to provide a novel visualization tool for packet capture (PCAP) files.

Demo: [https://pcap-viz.surge.sh/](https://pcap-viz.surge.sh/)

Student: [Juraj Uhlar](https://is.muni.cz/auth/osoba/422160), mail: [422160@mail.muni.cz](mailto:422160@mail.muni.cz)

## Running everything using Vagrant 

1. Make sure you have Vagrant installed (including a provider such as VirtualBox)
2. Run `start.sh` (on Linux) or `start.bat` (on Windows)

This will take a few minutes but eventually the application will be available on in your broswer on `localhost:3000`.
We recommend using Google Chrome with 1920x1080 resolution.

## Running the web application indivudually

In the console:

1. `cd frontend`
2. `yarn install`
3. `yarn start`

(You can use `npm` instead of `yarn`)

The web app runs on `localhost:3000`.

You can edit `frontend/src/utils/config.ts` to change the geolocation and fileserver URL between localhost and remote servers.

Web app is also deployed to: [https://pcap-viz.surge.sh/](https://pcap-viz.surge.sh/)

## Running the file server individually

Aside from Node and npm, the file server requires `tshark` to be installed and available in PATH. 

1. `cd backend/fileserver`
2. `yarn install`
3. `yarn start`

The servers runs on `localhost:5000`.

## Running the geolocation server individually

1. `cd backend/geolocation`
2. `yarn install`
3. `yarn start`

The servers runs on `localhost:5001`.