angular.module("tron", []).directive("map", function($compile){
	return{
		restrict: "E",
		replace: true,
		scope: {
			coordinates: "="
		},
		controller: function($scope){
			$scope.getOptions = function(){
				return{
					center: new google.maps.LatLng(0, 0),
					mapTypeId: google.maps.MapTypeId.TERRAIN,
					disableDefaultUI: true,
					panControl: false,
					scaleControl: false,
					zoomControl: false,
					overviewMapControl: false,
					mapTypeControl: false,
					draggable: false,
					navigationControl: false,
					scrollWheel: false,
					disableDoubleClickZoom: true,
					zoom: 2
				}
			};
			
			$scope.Point = function(location, value){
				this._location = location;
				this._value = value;
			}
			
			$scope.materializedEls = [];
			var CustomOverlay = function(list, map){
				this.list = list;
				this.elList = [];
			};
			CustomOverlay.prototype = new google.maps.OverlayView();
			CustomOverlay.prototype.onAdd = function(){
				var layer = this.getPanes().overlayLayer;
				for(var i=0, total=this.list.length; i<total; i+=1){
					var angularEl = angular.element("<span></span>").addClass("overlay-point label label-success").html(this.list[i]._value);
					this.elList.push(angularEl);
					layer.appendChild(angularEl[0]);
				}
			};
			CustomOverlay.prototype.draw = function(){
				var projection = this.getProjection();
				var total = this.list.length;
				for(var i=0; i<total; i+=1){
					var px = projection.fromLatLngToDivPixel(this.list[i]._location);
					var el = this.elList[i][0];
					el.style.left = px.x + "px";
					el.style.top = px.y + "px";
				}
				$scope.materializedEls = this.elList;
			};
			CustomOverlay.prototype.onRemove = function(){
				for(var i=0; i<$scope.materializedEls.length; i+=1){
					$scope.materializedEls[i][0].remove();
				}
			};
			
			$scope.createOverlay = function(list, map){
				var overlay = new CustomOverlay(list, map);
				return overlay;
			};
		},
		template: "<div id='map'>map goes here</div>",
		compile: function(tElement){
			return function(scope, element, attrs){
				google.maps.visualRefresh = true;
				var map = new google.maps.Map(element[0], scope.getOptions());
				
				var mapStyle1 = [
					{featureType: "water", elementType: "all", stylers: [{color: "#2b2b2b"}]},
					{featureType: "landscape", elementType: "all", stylers: [{color: "#000000"}]},
					{featureType: "administrative", elementType: "all", stylers: [{visibility: "off"}]},
					{featureType: "poi", elementType: "all", stylers: [{visibility: "off"}]},
					{featureType: "road", elementType: "all", stylers: [{visibility: "off"}]},
					{featureType: "transit", elementType: "all", stylers: [{visibility: "off"}]}
				];
				
				var mapStyle2 = [
					{"stylers": [{"visibility": "simplified"}]},
					{"stylers": [{"color": "#131314"}]},
					{"featureType": "water", "stylers": [{"color": "#131313"},{"lightness": 7}]},
					{"elementType": "labels.text.fill", "stylers": [{"visibility": "on"}, {"lightness": 25}]}
				];
				
				map.set("styles", mapStyle1);
				
				scope.$watch("coordinates", function(){
					if(scope.coordinates!=undefined && scope.coordinates.length>0){
						var list = [];
						for(var i=0, total = scope.coordinates.length; i<total; i+=1){
							var coord = scope.coordinates[i];
							list.push(new scope.Point(new google.maps.LatLng(coord.lat, coord.lon), coord.value));
						}
						var overlay = scope.createOverlay(list, map);
						overlay.onRemove();
						overlay.setMap(map);
					}
				});
			}
		}
	}
}).directive("pie", function($compile){
	return{
		restrict: "E",
		replace: true,
		scope: {
			data: "="
		},
		controller: function($scope){
		},
		template: "<div/>",
		compile: function(tElement){
			return function(scope, element, attrs){
				scope.$watch("data", function(){
					if(scope.data!=null){
						var arr = [];
						arr.push({label: "positive", value: scope.data[0].positive, percent: scope.data[0].positivePercentage});
						arr.push({label: "neutral", value: scope.data[0].neutral, percent: scope.data[0].neutralPercentage });
						arr.push({label: "negative", value: scope.data[0].negative, percent: scope.data[0].negativePercentage });
						reheatPie(arr);
					}
				});
				
				var width = 500, height = 500, pie, arc,
					colorScale, arc, canvas, radius, contentPane;
				
				var initPie = function(){
					pie = d3.layout.pie()
						.value(function(d){
						return d.value;
					});
	
					canvas = d3.select(element[0])
								.append("svg")
								.attr({"width": width, "height": height})
								.append("g")
								.attr("transform", "translate(" + width/2 + ", " + height/2 + ")");

					radius = 0.6 * (Math.min(width, height) / 2);

					arc = d3.svg.arc()
							.innerRadius(radius)
							.outerRadius(radius/2);

					colorScale = d3.scale.ordinal()
									.range(["#558C89", "#B8B8B8", "#784E5A"]);
				};
				
				var reheatPie = function(dataSet){		
					var data = pie(dataSet);

					canvas.selectAll("g").remove();	

					var enterSlices = canvas.selectAll("g")
										.data(data)
										.enter()
										.append("g")
										.on("click", function(evt){
											alert(JSON.stringify(evt.data.value));
										});

					enterSlices.append("path");
					enterSlices.append("text");
					enterSlices.append("polyline");

					var updateSlices = canvas.selectAll("g")
										.data(data);

					updateSlices.select("path")
					.transition()
					.attr("d", arc)
					.attr("fill", function(d, i){
						return colorScale(i);
					});

					updateSlices.select("text")
						.attr("transform", function(d){
							var midAngle = d.startAngle + (d.endAngle - d.startAngle)/2;
							var position = arc.centroid(d);
							var hypo = Math.sqrt((position[0] * position[0]) + (position[1] * position[1]));
							position[0] = position[0]/hypo * 1.4 * radius;
							position[1] = position[1]/hypo * 1.4 * radius;
							return "translate(" + position + ")";
						})
						.attr("text-anchor", "middle")
						.attr("font-size", "1em")
						.text(function(d){
							return d.data.percent + "% (" + d.data.value + ")";
						});

					updateSlices.select("polyline")
					.attr("class", "polyline")
					.attr("points", function(d){
						var position = arc.centroid(d);
						var hypo = Math.sqrt((position[0] * position[0]) + (position[1] * position[1]));
						position[0] = position[0]/hypo * 1.1 * radius;
						position[1] = position[1]/hypo * 1.1 * radius;
						return [arc.centroid(d), position];
					});

					canvas.selectAll("g")
					.data(data)
					.exit()
					.remove();
				};
				
				initPie();
			};
		}
	}
});