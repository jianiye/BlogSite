//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
var _ = require('lodash');
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
var LocalStrategy = require('passport-local').Strategy;
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
var findOrCreate = require('mongoose-findorcreate');

// app setting
const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
  // cookie: { secure: true }
}))
app.use(passport.initialize());
app.use(passport.session());

// db setting
mongoose.connect("mongodb+srv://admin-jiani:" + process.env.PASSCODE + "@jianicloud.rguorah.mongodb.net/blogDB", {
  useNewUrlParser: true
});
const blogSchema = new mongoose.Schema({
  title: String,
  content: String,
  ispost: Boolean,
  userid: String
});
const Blog = mongoose.model("Blog", blogSchema);

const homeStartingContent = "Lacus vel facilisis volutpat est velit egestas dui id ornare. Semper auctor neque vitae tempus quam. Sit amet cursus sit amet dictum sit amet justo. Viverra tellus in hac habitasse. Imperdiet proin fermentum leo vel orci porta. Donec ultrices tincidunt arcu non sodales neque sodales ut. Mattis molestie a iaculis at erat pellentesque adipiscing. Magnis dis parturient montes nascetur ridiculus mus mauris vitae ultricies. Adipiscing elit ut aliquam purus sit amet luctus venenatis lectus. Ultrices vitae auctor eu augue ut lectus arcu bibendum at. Odio euismod lacinia at quis risus sed vulputate odio ut. Cursus mattis molestie a iaculis at erat pellentesque adipiscing.";
const aboutContent = "Hac habitasse platea dictumst vestibulum rhoncus est pellentesque. Dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui.";
const home1 = new Blog({
  title: "Hello World",
  content: homeStartingContent,
  ispost: true
})
const about = new Blog({
  title: "About Me",
  content: aboutContent,
  ispost: false
})
const defaultcontents = [home1, about];

// authentication
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true // `email` must be unique
  },
  password: String,
  googleId: String,
  blogs: [mongoose.Types.ObjectId]
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());
// passport.use(new LocalStrategy(
//   User.createStrategy(),
//   function (username, password, done) {
//     console.log("Verification function called");
//     return done(null, { username, id: "1" });
//   }
// ))

// serialize and deserialize
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture
    });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENTID,
    clientSecret: process.env.CLIENTKEY,
    callbackURL: "http://localhost:3000/auth/google/home",
    // userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//-------------------------------------------------


app.get("/", function(req, res) {
  if (req.isAuthenticated()) {
    res.redirect("/home");
  } else {
    res.render("gate");
  }
});
app.get("/login", function(req, res) {
  res.render("login");
});
app.get("/register", function(req, res) {
  res.render("register");
});
app.get("/auth/google", passport.authenticate("google", {
  scope: ["profile"]
}));
app.get('/auth/google/home',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/home');
  });

app.get("/people/:uid", function(req, res){
  if (req.isAuthenticated()) {
    if  (req.user.id === req.params.uid) {
      res.redirect("/home");
    } else {

      User.findOne({_id: mongoose.Types.ObjectId(req.params.uid)}, function(err, foundUser){
        if(!err && foundUser){
          if(foundUser.blogs.length>0){
            Blog.find({
                '_id': { $in: foundUser.blogs}
            }, function(err, docs){
                 res.render("people", {hposts: docs});
            });
          } else {
            res.redirect("/home");
          }
        }else{
          res.redirect("/home");
        }
      });

    }
  } else {
    res.redirect("/visitor/"+req.params.uid);
  }
})

app.get("/visitor/:uid", function(req, res){
  User.findOne({_id: mongoose.Types.ObjectId(req.params.uid)}, function(err, foundUser){
    if(!err && foundUser){
      if(foundUser.blogs.length>0){
        Blog.find({
            '_id': { $in: foundUser.blogs}
        }, function(err, docs){
             res.render("visitor", {hposts: docs});
        });
      } else {
        res.redirect("/");
      }
    }else{
      res.redirect("/");
    }
  });
});

app.get("/home", function(req, res) {
  if (req.isAuthenticated()) {
    var userid = req.user.id;
    User.findOne({_id: mongoose.Types.ObjectId(userid)}, function(err, foundUser){
      if(!err && foundUser){
        if(foundUser.blogs.length>0){

          Blog.find({
              '_id': { $in: foundUser.blogs}
          }, function(err, docs){
               res.render("home", {hposts: docs});
          });

        } else {
          Blog.insertMany(defaultcontents, function(err, result){
            if (err) {
              console.log(err);
            } else {
              console.log("Successfully saved all defaultitems!");
              result.forEach(function(content){
                foundUser.blogs.push(mongoose.Types.ObjectId(content._id));
              });
              foundUser.save();
              res.redirect("/home");
            }
          });
        }
      }
    });
  } else {
    res.redirect("/");
  }
});

app.post("/register", function(req, res) {
  User.register({username: req.body.username}, req.body.password, function(err, user){
    if(err){
      console.log(err);
      res.redirect("/register");
    }else{
      passport.authenticate("local")(req, res, function() {
        res.redirect("/home");
      })
    }
  });
});

app.post("/login", function(req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  })
  req.login(user, function(err){
    if(err){
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/home");
      })
    }
  });
});

app.post("/logout", function(req, res) {
  req.logout(function(err){
    if(err){
      console.log(err);
    }
  });
  res.redirect("/");
})

// ---------------------------------------------------------

app.get("/about", function(req, res) {
  if (req.isAuthenticated()) {
  res.render("about", {
    about: aboutContent
  });
} else {
  res.redirect("/");
}});

app.get("/compose", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("compose", {
      tinykey: process.env.TINYKEY
    , texttitle: "Title", textcontent: "Hello world", textid: null});
  } else {
    res.redirect("/");
  }
});

app.get("/post/:id", function(req, res) {
  if (req.isAuthenticated()) {
  const blogid = req.params.id;
  Blog.findOne({
    _id: blogid
  }, function(err, foundblog) {
    if (!err) {
      res.render("post", {
        postitem: foundblog
      });
    }
  })
} else {
  res.redirect("/");
}});

app.post("/compose", function(req, res) {
if (req.isAuthenticated()) {
  if (req.body.textid){
    Blog.findByIdAndUpdate(req.body.textid, {title: req.body.newtitle, content: req.body.newpost}, function (err, docs) {
    if (err){
        console.log(err);
    }else{
        console.log("Updated Blog");
        res.redirect("/post/" + docs._id);
    }});
  }else{
  const post = new Blog({
    title: req.body.newtitle,
    content: req.body.newpost,
    ispost: true
  });
  post.save(function(err) {
    if (!err) {
      Blog.findOne({
        title: req.body.newtitle,
        content: req.body.newpost
      }, function(err, foundblog) {
        if (!err) {
          User.findOne({_id: mongoose.Types.ObjectId(req.user.id)}, function(err, foundUser){
            foundUser.blogs.push(mongoose.Types.ObjectId(foundblog._id));
            foundUser.save();
          });
          res.redirect("/post/" + foundblog._id);
        }
      })
    }
  });
}} else {
  res.redirect("/");
}});

app.post("/edit", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("compose", {
      tinykey: process.env.TINYKEY
    , texttitle: req.body.edititem, textcontent: req.body.editcontent, textid: req.body.editid});
  } else {
    res.redirect("/");
  }
});

app.post("/delete", function(req, res) {
 if (req.isAuthenticated()) {

  User.findByIdAndUpdate(req.user.id, {$pull: {blogs: mongoose.Types.ObjectId(req.body.deleteitem)}}, function(err, foundblogs){
     if(err){
       console.log(err);
     }
  })

  Blog.findByIdAndDelete(req.body.deleteitem, function (err, docs) {
      if (err){
          console.log(err)
      }
      else{
          console.log("Deleted : ", docs);
      }
  });
  res.redirect("/home");
} else {
  res.redirect("/");
}});


app.listen(3000, function() {
  console.log("Server started on port 3000");
});
