/*
db.tweets.distinct("timezone").length

db.tweets.find({"timezone":{$ne:null}},{coordinates:1,_id:0}).count()

db.tweets.group({
	key: {timezone: 1},
	initial: {count: 0},
	reduce: function(doc, o){
		o.count+=1;
	}
}).forEach(printjson)

db.tweets.find({"coordinates":{$ne:null}},{coordinates:1,_id:0}).count()

db.tweets.find({},{_id:0, "sentiment.score":1})

db.tweets.group({
	initial: {positive: 0, negative: 0, neutral: 0},
	reduce: function(doc, o){
		if(doc.sentiment.score>0){
			o.positive+=1
		} else if(doc.sentiment.score<0){
			o.negative+=1
		} else{
			o.neutral+=1
		}
	}
})
*/

var OAuth = require("OAuth"),
	Db = require("mongodb").Db,
	MongoClient = require("mongodb").MongoClient,
	sentiment = require("sentiment");

var dbUrl = "mongodb://localhost:27017/db1",
	collection = "tweets";
	
var requestTokenUrl = "https://api.twitter.com/oauth/request_token",
	accessTokenUrl = "https://api.twitter.com/oauth/access_token",
	oauthProtocol = "1.0A",
	algorithm = "HMAC-SHA1",
	apiKey = "UVSQ6Aqgv7VC6YeMyqIkng",
	apiSecret = "BFr4czoY0mTYHkMz1p6ZainqOwhXiDv134RppuxYu8",
	accessToken = "2356402326-s2e16jsQXX16sujoeaa23AC9BbIcgtXXMIl5j9Q",
	accessTokenSecret = "lWuREICT8PSszE5flXK8dRzcwHs6gvjP1DKVkVjd6tJeF";
	
var resource = "https://stream.twitter.com/1.1/statuses/filter.json?track=russia";

var oauth = new OAuth.OAuth(requestTokenUrl, accessTokenUrl, apiKey, apiSecret, oauthProtocol, null, algorithm);

var chunkCounter = 0;
setInterval(function(){
	console.log(chunkCounter);
}, 5000);

var request = oauth.get(resource, accessToken, accessTokenSecret);
request.on("response", function(stream){
	stream.on("data", function(chunk){
		try{
			var doc, jsonChunk = null;
			jsonChunk = JSON.parse(chunk);
			sentiment(jsonChunk.text, function(err, res){
				doc = {
					id: jsonChunk.id_str,
					created_at: jsonChunk.created_at,
					text: jsonChunk.text,
					coordinates: jsonChunk.coordinates,
					timezone: jsonChunk.user.time_zone,
					sentiment: res
				};
				dbInsert(doc);
			});
		}catch(err){
			console.log("failed to parse: " + jsonChunk);
		}finally{
			chunkCounter += 1;
		}
	});
	stream.on("end", function(){
		console.log("end");
	});
});
request.end();

var dbInsert = function(doc){
	MongoClient.connect(dbUrl, function(err, db){
		if(err) throw err;
		db.collection(collection, function(err, coll){
			var status = coll.insert(doc, {w: 0}, function(err, res){
				db.close();
			});
		});
	});
};