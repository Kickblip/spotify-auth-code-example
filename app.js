var express = require('express');
var querystring = require('querystring');
var cors = require('cors');
var cookieParser = require('cookie-parser');

const client_id = 'YOUR_CLIENT_ID';
const client_secret = 'YOUR_CLIENT_SECRET';
const redirect_uri = 'YOUR_REDIRECT_URI';

var generateRandomString = function (length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

let stateKey = 'spotify_auth_state'; // sets name of the cookie

let app = express();

app.use(express.static(__dirname + '/public'))
    .use(cors())
    .use(cookieParser());

app.get('/login', function (req, res) {

    var state = generateRandomString(16); // sets value of the cookie
    res.cookie(stateKey, state); // sets cookie

    // your application requests authorization
    var scope = 'user-read-private user-read-email';
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state
        }));
});

app.get('/callback', function (req, res) {

    // your application requests refresh and access tokens
    // after checking the state parameter

    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.redirect('/#' +
            querystring.stringify({
                error: 'state_mismatch'
            }));
    } else {
        res.clearCookie(stateKey);

        const authOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64'))
            },
            body: `code=${code}&redirect_uri=${redirect_uri}&grant_type=authorization_code`,
            json: true
        };

        fetch('https://accounts.spotify.com/api/token', authOptions)
            .then((response) => {
                if (response.status === 200) {
                    response.json().then((data) => {
                        let access_token = data.access_token
                        let refresh_token = data.refresh_token
                        res.redirect('/#' +
                            querystring.stringify({
                                access_token: access_token,
                                refresh_token: refresh_token
                            }));
                    });
                } else {
                    res.redirect('/#' +
                        querystring.stringify({
                            error: 'invalid_token'
                        }));
                };
            })
            .catch(error => {
                console.error(error);
            });
    }
});

app.get('/refresh_token', function (req, res) {
    // requesting access token from refresh token
    const refresh_token = req.query.refresh_token;
    const authOptions = {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64')),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `grant_type=refresh_token&refresh_token=${refresh_token}`,
    };

    fetch('https://accounts.spotify.com/api/token', authOptions)
        .then(response => {
            if (response.status === 200) {
                response.json().then((data) => {
                    const access_token = data.access_token;
                    res.send({ access_token });
                });
            };
        })
        .catch(error => {
            console.error(error);
            res.send(error);
        });
});

console.log('Listening on 8888');
app.listen(8888);