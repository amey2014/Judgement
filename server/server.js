var express = require('express'), 
	app = express();
	exphbs = require('express-handlebars'),
	logger = require('morgan'),
	cookieParser = require('cookie-parser'),
	bodyParser = require('body-parser'),
	methodOverride = require('method-override'),
	session = require('express-session'),
	passport = require('passport'),
	LocalStrategy = require('passport-local'),
	http = require('http').Server(app),
	io = require('socket.io')(http),
	config = require('./config.js'),
	funct = require('./functions.js'),
	socketModule = require('./socketModule.js');

//===============EXPRESS================
//Configure Express
app.use(logger('combined'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(session({secret: 'supernova', saveUninitialized: true, resave: true}));
app.use(passport.initialize());
app.use(passport.session());
app.use('/static', express.static('client'));
app.use('/i18n.js', express.static('i18n.js'));

//===============PASSPORT===============

//This section will contain our work with Passport

//Passport session setup.
passport.serializeUser(function(user, done) {
  console.log("serializing " + user.username);
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  console.log("deserializing " + obj);
  done(null, obj);
});

function ensureAuthenticated(req, res, next) {
	  if (req.isAuthenticated()) { return next(); }
	  req.session.error = 'Please sign in!';
	  res.redirect('/signin');
	}

app.use(function(req, res, next){
  var err = req.session.error,
      msg = req.session.notice,
      success = req.session.success;

  delete req.session.error;
  delete req.session.success;
  delete req.session.notice;

  if (err) res.locals.error = err;
  if (msg) res.locals.notice = msg;
  if (success) res.locals.success = success;

  next();
});

//Configure express to use handlebars templates
var hbs = exphbs.create({
    defaultLayout: 'main', //we will be creating this layout shortly
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

  console.log("Starting");

  passport.use('local-signin', new LocalStrategy(
		  {passReqToCallback : true}, //allows us to pass back the request to the callback
		  function(req, username, password, done) {
		    funct.localAuth(username, password)
		    .then(function (user) {
		    	console.log(user)
		      if (user) {
		        console.log("LOGGED IN AS: " + user.username);
		        req.session.success = 'You are successfully logged in ' + user.username + '!';
		        done(null, user);
		      }
		      if (!user) {
		        console.log("COULD NOT LOG IN");
		        req.session.error = 'Could not log user in. Please try again.'; //inform user could not log them in
		        done(null, user);
		      }
		    })
		    .fail(function (err){
		    	console.log( JSON.stringify(err))
		      console.log(err.body);
		    });
		  }
		));
//Use the LocalStrategy within Passport to register/"signup" users.
  passport.use('local-signup', new LocalStrategy(
    {passReqToCallback : true}, //allows us to pass back the request to the callback
    function(req, username, password, done) {
      funct.localReg(username, password)
      .then(function (user) {
        if (user) {
          console.log("REGISTERED: " + user.username);
          req.session.success = 'You are successfully registered and logged in ' + user.username + '!';
          done(null, user);
        }
        if (!user) {
          console.log("COULD NOT REGISTER");
          req.session.error = 'That username is already in use, please try a different one.'; //inform user could not log them in
          done(null, user);
        }
      })
      .fail(function (err){
        console.log(err.body);
      });
    }
  ));
  
  
var map = {
	
}

socketModule.initialize(io);

app.get('/', function (req, res) {
	if(req.user && req.user.username && req.user.username !== ''){
		res.sendFile( __dirname + "/" + "index.html", { user: req.user } );
	}else{
		res.render('signin');
	}
  
});

app.get('/userDetails', function(req, res){
	if(req.user && req.user.username && req.user.username !== ''){
		res.send( { username: req.user.username, isAdmin: req.user.isAdmin } );
	}else{
		res.render('signin');
	}
});

//displays our signup page
app.get('/signin', function(req, res){
  res.render('signin');
});

//sends the request through our local signup strategy, and if successful takes user to homepage, otherwise returns then to signin page
app.post('/local-reg', passport.authenticate('local-signup', {
  successRedirect: '/',
  failureRedirect: '/signin'
  })
);

app.post('/login', passport.authenticate('local-signin', {
	  successRedirect: '/',
	  failureRedirect: '/signin'
	  })
	);

//logs user out of site, deleting them from the session, and returns to homepage
app.get('/logout', function(req, res){
	var name = '';
	if(req.user){
		name = req.user.username;
	
	}
	console.log("LOGGIN OUT " + name)
  req.logout();
  res.redirect('/');
  req.session.notice = "You have successfully been logged out " + name + "!";
});

http.listen(5000, function(){
	  console.log('listening on *:5000');
	});



function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { 
	  console.log("authenticated!");
	  return next(); 
  }
  console.log("Not authenticated!");
  res.redirect('/login');
}