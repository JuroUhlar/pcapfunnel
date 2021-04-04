const express = require('express')
const geoipReader = require('@maxmind/geoip2-node').Reader;
const cors = require('cors');

const app = express()
const port = process.env.PORT || 5001;

app.enable('trust proxy');
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => res.send('The geolocation server is running.'))

geoipReader.open('./geo_database/GeoLite2-City.mmdb')
    .then(reader => {

        // POST API endpoinst for batch-requesting locations of multiple IPs
        app.post('/geoips', (req, res) => {
            let ips = req.body;
            console.log(`\nLooking up ${ips.length} IPs`);
            let result = [];
            let successCount = 0;
            ips.forEach(ip => {
                try {
                    lookUpResponse = reader.city(ip);
                    let location = {
                        query: ip,
                        status: 'success',
                        city: lookUpResponse.city.names ? lookUpResponse.city.names.en : 'n/a',
                        country: lookUpResponse.country.names.en || 'n/a',
                        countryCode: lookUpResponse.country.isoCode,
                        lat: lookUpResponse.location.latitude || 'n/a',
                        long: lookUpResponse.location.longitude || 'n/a',
                        accuracyRadius: lookUpResponse.location.accuracyRadius || 'n/a',
                    }
                    successCount += 1;
                    result.push(location);
                } catch (error) {
                    result.push({
                        query: ip,
                        status: 'fail',
                        message: error,
                    })
                }

            })
            console.log(`==> Successful lookups: ${successCount}`);
            res.json(result);
            res.end;
        });


        // GET API endpoints for reuquesting the location of a single IP
        app.get('/geoip/:ip', (req, res) => {
            try {
                lookUpResponse = reader.city(req.params.ip);
                let response = {
                    ip: req.params.ip,
                    city: lookUpResponse.city.names ? lookUpResponse.city.names.en : 'n/a',
                    country: lookUpResponse.country.names.en,
                    countryCode: lookUpResponse.country.isoCode,
                    lat: lookUpResponse.location.latitude,
                    long: lookUpResponse.location.longitude,
                    accuracyRadius: lookUpResponse.location.accuracyRadius,
                }
                console.log('\n', response);
                res.json(response);
                res.end;
            } catch (error) {
                // console.log(error);
                if (error.name === 'AddressNotFoundError') {
                    res.status(404).send(error);
                }
                if (error.name === 'ValueError') {
                    res.status(422).send(error);
                }
            }
        });

    })
    .catch(error => {
        console.log(error);
        res.status(500).send('500 Server error: opening the GEO IP database failed');
    });

app.listen(port, () => console.log(`The geolocation server is listening on http://localhost:${port}`))
