var express = require("express"),
	Db = require("mongodb").Db,
	MongoClient = require("mongodb").MongoClient,
	io = require("socket.io");

var dbUrl = "mongodb://localhost:27017/db1",
	collection = "tweets";

var queryForList = function(fn, doneFn){
	MongoClient.connect(dbUrl, function(err, db){
		if(err) throw err;
		db.collection(collection, function(err, coll){
			var stream = coll.find({}, {id:1, text:1, _id:0, created_at:1, "sentiment.score": 1}).sort({created_at:-1}).limit(10).stream();
			stream.on("data", function(doc){
				fn(doc);
			});
			stream.on("end", function(){
				db.close();
				doneFn();
			});
		});
	});
};

var queryForCoordinates = function(fn, doneFn){
	MongoClient.connect(dbUrl, function(err, db){
		if(err) throw err;
		db.collection(collection, function(err, coll){
			var stream = coll.find({"coordinates":{$ne:null}},{text:1, coordinates:1,_id:0}).stream();
			stream.on("data", function(doc){
				fn({
					text: doc.text,
					lat: doc.coordinates.coordinates[0],
					lon: doc.coordinates.coordinates[1]
				});
			});
			stream.on("end", function(){
				db.close();
				doneFn();
			});
		});
	});
};

var queryForSentiments = function(fn){
	MongoClient.connect(dbUrl, function(err, db){
		db.collection(collection, function(err, coll){
			coll.aggregate([
				{$group: {
					_id: "sentiments count", 
					positive: {$sum: {$cond: [{$gt: ["$sentiment.score", 0]}, 1, null]}},
					negative: {$sum: {$cond: [{$lt: ["$sentiment.score", 0]}, 1, null]}},
					neutral: {$sum: {$cond: [{$eq: ["$sentiment.score", 0]}, 1, null]}}
				}}
			], function(err, res){
				fn(res);
				db.close();
			});
		});
	});
};

var queryForTweet = function(tweetId, fn, doneFn){
	MongoClient.connect(dbUrl, function(err, db){
		if(err) throw err;
		db.collection(collection, function(err, coll){
			var stream = coll.find({id:tweetId}).stream();
			stream.on("data", function(doc){
				fn(doc);
			});
			stream.on("end", function(){
				db.close();
				doneFn();
			});
		});
	});
};

var app = express();
app.use(app.router);
app.use(express.static(__dirname + "/public"));

app.set("views", __dirname + "/views");
app.set("view engine", "jade");

app.get("/realtime", function(req, res){
	res.render("realtime");
});

app.get("/map", function(req, res){
	res.render("map");
});

app.get("/sentiments", function(req, res){
	res.render("sentiments");
});

app.get("/", function(req, res){
	res.render("home");
});

io = io.listen(app.listen(2000), {log: false});
console.log('Server running at http://127.0.0.1:' + 2000 + "/");

io.sockets.on("connection", function(socket){	
	
	socket.on("START_LIST", function(){
		queryForList(function(doc){
			socket.emit("CHUNK_LIST", doc);
		}, function(){
			socket.emit("END_LIST", null);
		})
	});
	
	socket.on("REQUEST_COORDINATES", function(){
		var dataSet = [];
		queryForCoordinates(function(doc){
			dataSet.push({
				lat: doc.lat,
				lon: doc.lon,
				value: 1
			});
		}, function(){
			socket.emit("REPLY_COORDINATES", dataSet);
		});
	});
	
	socket.on("REQUEST_SENTIMENTS", function(){
		queryForSentiments(function(doc){
			socket.emit("SENTIMENTS", doc);
		});
	});

	socket.on("REQUEST_TWEET", function(o){
		queryForTweet(o.tweetId, function(doc){
			socket.emit("TWEET", doc);
		}, function(){
			
		})
	});
	
	socket.on("disconnect", function(){
	});
});