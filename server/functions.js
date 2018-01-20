// functions.js/
var bcrypt = require('bcryptjs'),
    Q = require('q'),
    config = require('./config.js'), //config file contains all tokens and other private info
    db = require('orchestrate')(config.db); //config.db holds Orchestrate token
  
var mongodb = require('mongodb');
var uri = 'mongodb://aparab:judgement12345@ds127391.mlab.com:27391/library';

//used in local-signup strategy
exports.localReg = function (username, password) {
  var deferred = Q.defer();
  var hash = bcrypt.hashSync(password, 8);
  var userDetails = username.split('#');
  
  var user = {
    "username": userDetails[0],
    "password": hash,
    "avatar": "http://placepuppy.it/images/homepage/Beagle_puppy_6_weeks.JPG"
  }
  if(userDetails[1] && userDetails[1] === 'admin'){
	  user.isAdmin = true;
  }
  else{
	  user.isAdmin = false;
  }
  
  mongodb.MongoClient.connect(uri, function(err, db) {
    if(err) throw err;
    console.log('Connected to db');
  
    var users = db.collection('users');
    //check if username is already assigned in our database
    users.count({ username: userDetails[0] }, function(err, count) {
      if (err) {
        console.log('ERROR OCCURED WHILE CHECKING USER:', err);
        db.close();
        deferred.reject(new Error(err));
      }

      if (count > 0) { //case in which user already exists in db
        console.log('USERNAME ALREADY EXISTS:', userDetails[0]);
        db.close();
        deferred.resolve(false);
      } else { //case in which user does not already exist in db
        // insert new user into db
        users.insert(user, function(err, data) {          
          if (err) {
            console.log("INSERT FAILED: " + err);
            db.close();
            deferred.reject(new Error(err));
          } else {
            db.close();
            deferred.resolve(user);
          }
        });
      }
    });
  });

  return deferred.promise;
};

//check if user exists
    //if user exists check if passwords match (use bcrypt.compareSync(password, hash); // true where 'hash' is password in DB)
      //if password matches take into website
  //if user doesn't exist or password doesn't match tell them it failed
exports.localAuth = function (username, password) {
  var deferred = Q.defer();

  mongodb.MongoClient.connect(uri, function(err, db) {
    if(err) throw err;
    console.log('Connected to db');
  
    var users = db.collection('users');
    //check if username is already assigned in our database
    users.findOne({ username: username }, function(err, user) {
      if (err) {
        console.log('ERROR OCCURED WHILE CHECKING USER:', err);
        db.close();
        deferred.reject(new Error(err));
      }

      if (user) { //case in which user already exists in db
        console.log('USER FOUND:', user.username);
        var hash = user.password;
        if (bcrypt.compareSync(password, hash)) {
          deferred.resolve(user);
        } else {
          console.log("PASSWORDS DO NOT MATCH");
          deferred.resolve(false);
        }
        db.close();
      } else { //case in which user does not already exist in db
        console.log("COULD NOT FIND USER IN DB FOR SIGNIN");
        deferred.resolve(false);
      }
    });
  });

  return deferred.promise;
}