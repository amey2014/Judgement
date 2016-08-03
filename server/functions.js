// functions.js/
var bcrypt = require('bcryptjs'),
    Q = require('q'),
    config = require('./config.js'), //config file contains all tokens and other private info
    db = require('orchestrate')(config.db); //config.db holds Orchestrate token

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
  //check if username is already assigned in our database
  db.get('local-users', userDetails[0])
  .then(function (result){ //case in which user already exists in db
    console.log('username already exists');
    deferred.resolve(false); //username already exists
  })
  .fail(function (result) {//case in which user does not already exist in db
      console.log(result.body);
      if (result.body.message == 'The requested items could not be found.'){
        //console.log('Username is free for use');
        db.put('local-users', userDetails[0], user)
        .then(function () {
          console.log("USER: " + user);
          deferred.resolve(user);
        })
        .fail(function (err) {
          console.log("PUT FAIL:" + err.body);
          deferred.reject(new Error(err.body));
        });
      } else {
        deferred.reject(new Error(result.body));
      }
  });

  return deferred.promise;
};

//check if user exists
    //if user exists check if passwords match (use bcrypt.compareSync(password, hash); // true where 'hash' is password in DB)
      //if password matches take into website
  //if user doesn't exist or password doesn't match tell them it failed
exports.localAuth = function (username, password) {
  var deferred = Q.defer();

  db.get('local-users', username)
  .then(function (result){
    console.log("FOUND USER");
    var hash = result.body.password;
    //console.log(hash);
    console.log(bcrypt.compareSync(password, hash));
    if (bcrypt.compareSync(password, hash)) {
      deferred.resolve(result.body);
    } else {
      console.log("PASSWORDS NOT MATCH");
      deferred.resolve(false);
    }
  }).fail(function (err){
    if (err.body.message == 'The requested items could not be found.'){
          console.log("COULD NOT FIND USER IN DB FOR SIGNIN");
          deferred.resolve(false);
    } else {
      deferred.reject(new Error(err));
    }
  });

  return deferred.promise;
}