//For social media login to work you will need to register your website at the different authorization servers.
//And then fill in the nescessery ids/secrets/keys

var COOKIE_SECRET = 'some random string'

var FACEBOOK_id = ""
var FACEBOOK_secret = ""

var GOOGLE_id = ""
var GOOGLE_secret = ""

var TWITTER_id = ""
var TWITTER_secret = ""

var STEAM_API_key = ""

var BATTLENET_id = ""
var BATTLENET_secret = ""

var VK_id = ""
var VK_secret = ""

var express = require('express')

var Session = require('express-session');
var FileStore = require('session-file-store')(Session);
var router = express.Router();
var passport = require('passport');
var bodyParser = require('body-parser');

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

function get_hostname(req) {
	var parts = req.hostname.split('.');
	while (parts.length > 2) {
		parts.shift();
	}
	return parts.join('.');
}

var sessionCache = {}
app.use(function (req, res, next) {
	var host = get_hostname(req);
	if (!sessionCache[host]) {
		sessionCache[host] = Session({
		  store: new FileStore(),
		  secret: COOKIE_SECRET,
		  cookie: {domain:get_hostname(req), expires: new Date(Date.now() + 30 * 86400 * 1000)}, //30 days
		  resave: false,
		  saveUninitialized: true,
		});
	}
	sessionCache[host](req, res, next);
});

var path = require('path');
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
	done(null, user);
});
passport.deserializeUser(function(user, done) {	
	done(null, user);
});

app.use(express.static(path.join(__dirname, 'public')));

function save_return(req, res, next) {
	req.session.return_to = req.headers.referer;
	next();
}

function redirect_return(req, res, next) {
	//uncomment to redirect to original page instead
	//res.redirect(req.session.return_to);
	//delete req.session.return_to;
	res.status(200).send("You are logged in as: \n<pre>" + JSON.stringify(req.session.passport.user, null, '\t') + "</pre>");
	return;
}

if (GOOGLE_id != "") {
	StrategyGoogle = require('passport-google-oauth2').Strategy;
	passport.use('google', new StrategyGoogle({
		clientID: GOOGLE_id,
		clientSecret: GOOGLE_secret,
		callbackURL: '/auth/google/callback',
		scope: 'https://www.googleapis.com/auth/userinfo.profile',
		passReqToCallback:true,
		stateless: true
	  },
	  function(req, accessToken, refreshToken, profile, done) {
		done(null, profile);
	  }
	));

	router.post('/auth/google', save_return, passport.authenticate('google'));
	router.get('/auth/google/callback', passport.authenticate('google'), redirect_return);
}

if (FACEBOOK_id != "") {
	FacebookStrategy = require('passport-facebook').Strategy;
	passport.use('facebook', new FacebookStrategy({
		clientID: FACEBOOK_id,
		clientSecret: FACEBOOK_secret,
		callbackURL: "/auth/facebook/callback",
		passReqToCallback: true,
		stateless: true
	  },
	  function(req, accessToken, refreshToken, profile, done) {
		done(null, profile);
	  }
	));
	
	//facebook
	router.post('/auth/facebook', save_return, passport.authenticate('facebook'));
	router.get('/auth/facebook/callback', passport.authenticate('facebook'), redirect_return);
}

if (TWITTER_id != "") {
	TwitterStrategy = require('passport-twitter').Strategy;
	passport.use('twitter', new TwitterStrategy({
		consumerKey: TWITTER_id,
		consumerSecret: TWITTER_secret,
		callbackURL: "/auth/twitter/callback",
		passReqToCallback: true,
		stateless: true
	  },
	  function(req, token, tokenSecret, profile, done) {
		done(null, profile);
	  }
	));	
	
	//twitter
	router.post('/auth/twitter', save_return, passport.authenticate('twitter'));
	router.get('/auth/twitter/callback', passport.authenticate('twitter'), redirect_return);
}

if (VK_id != "") {
	var VKontakteStrategy = require('passport-vkontakte').Strategy;
	passport.use('vk', new VKontakteStrategy({
		clientID: VK_id, // VK.com docs call it 'API ID'
		clientSecret: VK_secret,
		callbackURL: '/auth/vk/callback',
		passReqToCallback:true,
		stateless: true
	  },
	  function(req, accessToken, refreshToken, profile, done) {
		done(null, profile);
	  }
	));
	
	//vk
	router.post('/auth/vk', save_return, passport.authenticate('vk'));
	router.get('/auth/vk/callback', passport.authenticate('vk'), redirect_return);
}

if (BATTLENET_id != "") {
	StrategyBnet = require('passport-bnet').Strategy;
	passport.use('battlenet', new StrategyBnet({
		clientID: BATTLENET_id,
		clientSecret: BATTLENET_secret,
		callbackURL: "https://karellodewijk.github.io/battlenet_redirect.html",
		passReqToCallback:true,
		stateless: true
	  },
	  function(req, accessToken, refreshToken, profile, done) {
		done(null, profile);
	  }
	));
	
	StrategyBnet.prototype.authorizationParams = function(options) {
	  return { state: options.redirectUrl };
	};
	
	router.post('/auth/battlenet', save_return, function(req,res,next) { passport.authenticate('battlenet', { redirectUrl:'http://' + get_hostname(req) + '/auth/battlenet/callback' })(req, res, next); } );
	router.get('/auth/battlenet/callback', passport.authenticate('battlenet'), redirect_return);
}

if (STEAM_API_key != "") {		
	var SteamWebAPI = require('steam-web');
	var OpenIDStrategy = require('passport-openid').Strategy;
	var steam = new SteamWebAPI({ apiKey: STEAM_API_key, format: 'json' });
	passport.use('steam', new OpenIDStrategy({
			returnURL: function(req) { 
				return "http://" + get_hostname(req) + "/auth/steam/callback/";
			},
			realm: function(req) { 
				return "http://" + get_hostname(req); 
			},
			provider: 'steam',
			name:'steam',
			profile:false,
			providerURL: 'http://steamcommunity.com/openid/id/',
			passReqToCallback: true,
			stateless: true
		},
		function(req, identifier, done) {
			steam.getPlayerSummaries({
				steamids: [ identifier ],
				callback: function(err, result) {
					if (!err) {
						done(null, result.response.players[0]);
					}
				}
			});			
		}
	));
	
	//steam
	router.post('/auth/steam', save_return, passport.authenticate('steam'));
	router.get('/auth/steam/callback', passport.authenticate('steam'), redirect_return);
}

OpenIDStrategy = require('passport-openid').Strategy;
passport.use('openid', new OpenIDStrategy({
		returnURL: function(req) { 
			return 'http://'+get_hostname(req)+"/auth/openid/callback";
		},
		passReqToCallback: true,
		stateless: true
	},
	function(req, identifier, done) {
		console.log("Do i get here")
		var user = {};
		user.server = identifier.split('://')[1].split(".wargaming")[0];
		user.identity_provider = "wargaming";
		user.identity = identifier.split('/id/')[1].split("/")[0];
		user.wg_account_id = user.identity.split('-')[0];
		user.name = user.identity.split('-')[1];
		done(null, user);
	}
));

//openid
router.post('/auth/openid', save_return, passport.authenticate('openid'));
router.get('/auth/openid/callback', passport.authenticate('openid'), redirect_return);

//add router to app
app.use('/', router);	

app.listen(80, function () {
  console.log('Login demo app listening on port 80!')
})
