var App = angular.module("App", ["tron"]);

App.factory("socket", function($rootScope){
	var socket = io.connect("http://localhost:2000", {reconnect: false});
	return{
		on: function(event, cb){
			socket.on(event, function(){
				var args = arguments;
				$rootScope.$apply(function(){
					cb.apply(socket, args);
				});
			});
		},
		emit: function(event, obj){
			socket.emit(event, obj);
		}
	};
});

App.controller("BaseCtrl", function(){

});

App.controller("ListCtrl", function($scope, socket, $timeout, $log){
	
	socket.on("connect", function(){
		$log.debug("connected");
	});
	
	socket.on("disconnect", function(){
		$log.debug("disconnect");
		$timeout.cancel(timer);
	});
	
	$scope.data = [];
	socket.on("CHUNK_LIST", function(data){
		$scope.data.push(data);
	});
	
	var timer;
	socket.on("END_LIST", function(){
		timer = $timeout(function(){
			socket.emit("START_LIST", {});
			$scope.data = [];
		}, 2000);
	});
	
	socket.emit("START_LIST", null);
});

App.controller("MapCtrl", function($scope, socket, $timeout, $log){
	/*
	var dataSet = [
		[{lat: 42.3581, lon: -71.0636, value: 1}, {lat: 51.5072, lon: -0.1275, value: 1}, {lat: 18.9750, lon: 72.8258, value: 1}, {lat: -33.8600, lon: 151.2111, value: 1}],
		[{lat: 42.3581, lon: -71.0636, value: 10}, {lat: 51.5072, lon: -0.1275, value: 10}, {lat: 18.9750, lon: 72.8258, value: 10}, {lat: -33.8600, lon: 151.2111, value: 10}],
		[{lat: 42.3581, lon: -71.0636, value: 100}, {lat: 51.5072, lon: -0.1275, value: 100}, {lat: 18.9750, lon: 72.8258, value: 100}, {lat: -33.8600, lon: 151.2111, value: 100}],
		[{lat: 42.3581, lon: -71.0636, value: 1000}, {lat: 51.5072, lon: -0.1275, value: 1000}, {lat: 18.9750, lon: 72.8258, value: 1000}, {lat: -33.8600, lon: 151.2111, value: 1000}]
	];

	var counter = 0;
	$interval(function(){
		if(counter > dataSet.length){counter = 0;}
		$scope.coordinates = dataSet[counter];
		counter+=1;
	}, 1000);
	*/
	
	socket.on("connect", function(){
		$log.debug("connected");
	});
	
	socket.on("disconnect", function(){
		$log.debug("disconnect");
		$timeout.cancel(timer);
	});
	
	var timer;
	socket.on("REPLY_COORDINATES", function(dataSet){
		$scope.coordinates = dataSet;
		timer = $timeout(function(){
			socket.emit("REQUEST_COORDINATES", {});
			$scope.coordinates = [];
		}, 2000);
	});
		
	socket.emit("REQUEST_COORDINATES", {});
});

App.controller("SentimentsCtrl", function($scope, socket, $timeout, $log){
	$scope.data = null;

	$scope.currentTweetId = null;
	
	$scope.onTweetClick = function(tweetId){
		$scope.currentTweetId = tweetId;
		socket.emit("REQUEST_TWEET", {tweetId: tweetId});
	};

	socket.on("TWEET", function(data){
		$('#tweetModal').foundation('reveal', 'open');
		$scope.currentTweetData = JSON.stringify(data);
	});

	socket.on("connect", function(){
		$log.debug("connected");
	});
	
	socket.on("disconnect", function(){
		$log.debug("disconnect");
		$timeout.cancel(timer);
	});
	
	var timer;
	socket.on("SENTIMENTS", function(data){
		var sum = data[0].positive + data[0].negative + data[0].neutral;
		data[0].positivePercentage = Math.round(data[0].positive * 100 / sum);
		data[0].negativePercentage = Math.round(data[0].negative * 100 / sum);
		data[0].neutralPercentage = Math.round(data[0].neutral * 100 / sum);

		$scope.data = data;

		timer = $timeout(function(){
			socket.emit("REQUEST_SENTIMENTS", {});
		}, 2000);
	});

	$scope.tweets = [];
	socket.on("CHUNK_LIST", function(data){
		$scope.tweets.push(data);
	});
	
	var timer;
	socket.on("END_LIST", function(){
		timer = $timeout(function(){
			socket.emit("START_LIST", {});
			$scope.tweets = [];
		}, 2000);
	});
	
	socket.emit("REQUEST_SENTIMENTS", null);
	socket.emit("START_LIST", null);
});

$(document).ready(function(){
 	$(document).foundation();
});