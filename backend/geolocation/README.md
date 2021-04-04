## Geolocation API utiliy

A simple Node server for getting geolocation data for a list of IPs. The API is a simplified version of the [ip-api.com](https://ip-api.com/docs/api:json) API. Uses the free [GeloLite2-City](https://dev.maxmind.com/geoip/geoip2/geolite2/#Databases) geolocation database from Maxmind. It's a little less accurate, but no usage limits.

Repo contains metadata files for deployment to Heroku and Google Cloud.

## Runnng the server

1. `yarn install`
2. `yarn start`

The server run on `localhost:5001`.

## Usage

POST request to `http://localhost:5000/geoips` with a body containing an array of IP strings:

```json 
[
    "192.168.3.131",
    "204.14.234.85",
]
```

As a response you get and array of hits and misses:

```json 
[

    {
        "query": "192.168.3.131",
        "status": "fail",
        "message": {
            "name": "AddressNotFoundError"
        }
    },
    {

        "query": "204.14.234.85",
        "status": "success",
        "city": "San Francisco",
        "country": "United States",
        "countryCode": "US",
        "lat": 37.7958,
        "long": -122.4203,
        "accuracyRadius": 1000
    }
]

```
