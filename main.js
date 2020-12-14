// capital variable is global

// entry point for interactive diagrams
function main() {

	// set values of true positives vs. false positives
	var tprValue = 300;
	var fprValue = -700;

	// make models to represent different distributions
	var distributionExample0 = new GroupModel(makeNormalItems(0, 1, 150, 70, 7)
		.concat(makeNormalItems(0, 0, 150, 30, 7)), tprValue, fprValue);
	var distributionExample1 = new GroupModel(makeNormalItems(0, 1, 150, 60, 10)
		.concat(makeNormalItems(0, 0, 150, 40, 10)), tprValue, fprValue);

	// make a model to represent initial example of classification
	var singleModel = new GroupModel(makeNormalItems(0, 1, 100, 60 ,10)
		.concat(makeNormalItems(0, 0, 100, 40, 10)), tprValue, fprValue);

	// need to classify to get colors to look right on thistogram
	// why lower distribution color is grey without this statement?
	distributionExample0.classify(0);
	distributionExample1.classify(0);

	// make correctness matrices
	createCorrectnessMatrix('single-correct0', singleModel);

	// make histograms
	createHistogram('plain-histogram0', distributionExample0, true);
	createHistogram('plain-histogram1', distributionExample1, true);
	createHistogram('single-histogram0', singleModel);

	// add legend
	createSimpleHistogramLegend('plain-histogram-legend0', 0);
	createSimpleHistogramLegend('plain-histogram-legend1', 0);
	createHistogramLegend('single-histogram-legend0', 0);

	// create pie charts
	createRatePies('single-pies0', singleModel, PIE_COLORS[0]);

	function updateTextDisplays(event) {
		// update number readouts
		function display(id, value) {
			var element = document.getElementById(id);
			element.innerHTML = '' + value;
			element.style.color = value < 0 ? '#f00' : 'white';
		}
		display('single-profit0', singleModel.profit);
	}

	// update text whenever any of the interactive models change
	singleModel.addListener(updateTextDisplays);

	// initialize everything
	singleModel.classify(50);
	singleModel.notifyListeners();
}

// models for threshold classifiers along with simple optimization code

// an item with an intrinsic value, predicted classification, and a "score"
// for use by a threshold classifier.
// The going assumption is that the values and predicted values are 0 or 1.
// Furthermore "1" is considered a positive/good value
// (tak 20Dec) this is constructor function, equivalent with class
var Item = function(category, value, score) {
	this.category = category;
	this.value = value;
	this.predicted = value;
	this.score = score;
};

// a group model defines a group of items, with a threshold
// for a classifier and associated values for true and false positives
// It also can notify listeners that an event has occurred to change the model
var GroupModel = function(items, tprValue, fprValue) {
	// data defining the model
	this.items = items;
	this.tprValue = tprValue;
	this.fprValue = fprValue;
	// observers of the model; needed for interactive diagrams
	this.listeners = [];
};

// classify according to the given threshold either good or bad prediction
// and store various interesting metrics for future use
GroupModel.prototype.classify = function(threshold) {
	this.threshold = threshold;

	// classify and find positive rates
	var totalGood = 0;
	var totalPredictedGood = 0;
	var totalGoodPredictedGood = 0;
	this.items.forEach(function(item) {
		item.predicted = item.score >= threshold ? 1 : 0;
	});
	this.tpr = tpr(this.items);
	this.positiveRate = positiveRate(this.items);

	// find profit
	this.profit = profit(this.items, this.tprValue, this.fprValue);
};

// GroupModels follow a very simple observer pattern; they have
// listerners which can be notified of arbitrary events
GroupModel.prototype.addListener = function(listener) {
	this.listeners.push(listener);
};

// tell all listeners of the specified event
GroupModel.prototype.notifyListeners = function(event) {
	this.listeners.forEach(function(listener) {listener(event);});
};

// create items whose scores have a "deterministic normal" distribution.
// that is, the items track a gaussian curve.
// this is not the same as actually choosing scores normally,
// but for expository purposes it's useful to have deterministic,
// smooth distributions of values

// (tak, 20Dec)
// this floor(e) creates normal distribution as a function of score
// with "n" of simulation data set
// "value" is to distinguish distributions in a same chart, either 0 or 1
// in the chart we have 2 distributions and need to distinguish such as color
// "category" is different poeple group, blue or orange in color difinition. Not to be used for now
function makeNormalItems(category, value, n, mean, std) {
	var items = [];
	var error = 0;
	for (var score = 0; score < 100; score++) {
		var e = error + n * Math.exp(-(score - mean) * (score - mean) / (2 * std * std)) /
				(std * Math.sqrt(2 * Math.PI));
		var m = Math.floor(e);
		error = e - m;
		for (var j = 0; j < m; j++) {
			items.push(new Item(category, value, score));
		}
	}
	return items
}

// profit of a model, subject to teh gien values
// for true and false positives. note that the simple model
// in the paper assumes zero value for nagatives
function profit(items, tprValue, fprValue) {
	var sum = 0;
	items.forEach(function(item) {
		if (item.predicted == 1) {
			sum += item.value == 1 ? tprValue : fprValue;
		}
	});
	return sum;
}

// count specified type of items
function countMatches(items, value, predicted) {
	var n = 0;
	items.forEach(function(item) {
		if (item.value == value && item.predicted == predicted) {
			n++;
		}
	});
	return n;
}

// calculate true positive rate (tpr)
function tpr(items) {
	var totalGood = 0;
	var totalGoodPredictedGood = 0;
	items.forEach(function(item) {
		totalGood += item.value;
		totalGoodPredictedGood += item.value * item.predicted;
	});
	if (totalGood == 0) {
		return 1;
	}
	return totalGoodPredictedGood / totalGood;
}

// calculate overall positive rate
function positiveRate(items) {
	var totalGood = 0;
	items.forEach(function(item) {
		totalGood += item.predicted;
	});
	return totalGood / items.length;
}


// side of grid in histograms and correctness matrices
var SIDE = 7;

// component dimensions. capital means global variable
var HEIGHT = 275;
var HISTOGRAM_WIDTH = 400;
var HISTOGRAM_LEGEND_HEIGHT = 50;

// histogram bucket width
var HISTOGRAM_BUCKET_SIZE = 2;

// padding on left; needed within svg so annotations show up
var LEFT_PAD = 0;

// colors of categories of items. "category" is either granted or denied
var CATEGORY_COLORS = ['#B4DCF5', '#c70'];

// colors for pie slices; set by hand because of various tradeoffs
// order: false negative, true negative, true positive, false positive
var PIE_COLORS = [['#FFDBDB', '#897779','#B4DCF5', '#3C4954'],
                  ['#686868', '#ccc','#c70',  '#f0d6b3']]

// d3 legend color
function itemColor(category, predicted) {
	return predicted == 0 ? '#FFDBDB' : CATEGORY_COLORS[category];
}

// d3 legend opacity. "value" is distinguishment for 2 distributions
function itemOpacity(value) {
	return .3 + .7 * value;
}

// circle dots color
function iconColor(d) {
	return d.predicted == 0 && !d.colored ? '#FFDBDB' : CATEGORY_COLORS[d.category];
}

// circle dots opacity
function iconOpacity(d) {
	return itemOpacity(d.value);
}

// icon for a person in histogram or correctness matrix
function defineIcon(selection) {
	selection
		.attr('class', 'icon')
		.attr('stroke', iconColor)
		.attr('fill', iconColor)
		.attr('fill-opacity', iconOpacity)
		.attr('stroke-opacity', function(d) {return .4 + .6 * d.value;})
		.attr('cx', function(d) {return d.x + d.side / 2;})
		.attr('cy', function(d) {return d.y + d.side / 2;})
		.attr('r', function(d) {return d.side * .4;});
}

// distribution dots(icons) creation
function createIcons(id, items, width, height, pad) {
	var svg = d3.select('#' + id).append('svg')
		.attr('width', width)
		.attr('height', height);
	if (pad) {
		svg = svg.append('g').attr('transform', 'translate(' + pad + ', 0)');
	}
	//we can just go with svg.selectAll without var icon =
	var icon = svg.selectAll('.icon')
		.data(items).enter()
			.append('circle')
			.call(defineIcon);
	return svg
}

// grid layout for createCorrectnessMatrix
function gridLayout(items, x, y) {
	items = items.reverse();
	var n = items.length;
	var cols = 15;
	var rows = Math.ceil(n / cols);
	items.forEach(function(item, i) {
		item.x = x + SIDE * (i % cols);
		item.y = y + SIDE * Math.floor(i / cols);
		item.side = SIDE;
	});
}

// shallow copy of item array
function copyItems(items) {
	return items.map(function(item) {
		var copy = new Item(item.category, item.value, item.score);
		copy.predicted = item.predicted;
		return copy;
	});
}

// create histogram for scores of items in a model (item is each event on dot in visualization)
function createHistogram(id, model, noThreshold, includeAnnotation) {
	var width = HISTOGRAM_WIDTH;
	var height = HEIGHT;
	var bottom = height - 16;

	// create an internal copy
	var items = copyItems(model.items);
	// console.log(items);

	// icons
	var numBuckets = 100 / HISTOGRAM_BUCKET_SIZE;
	var pedestalWidth = numBuckets * SIDE
	var hx = (width - pedestalWidth) /2;
	var scale = d3.scaleLinear().range([hx, hx + pedestalWidth]).domain([0, 100]);

	function histogramLayout(items, x, y, side, low, high, bucketSize) {
		var buckets = [];
		var maxNum = Math.floor((high - low) / bucketSize);
		items.forEach(function(item) {
			var bn = Math.floor((item.score - low) / bucketSize);
			bn = Math.max(0, Math.min(maxNum, bn));
			buckets[bn] = 1 + (buckets[bn] || 0);
			item.x = x + side * bn;
			item.y = y - side * buckets[bn];
			item.side = side;
		});
	}

	// draw histogram
	histogramLayout(items, hx, bottom, SIDE, 0, 100, HISTOGRAM_BUCKET_SIZE);
	var svg = createIcons(id, items, width, height);

	// drow x axis (scores from 0 to 100)
	var tx = width / 2;
	var topY = 60;
	var axis = d3.axisBottom(scale);
	svg.append('g')
		.attr('transform', 'translate(0, -8)')
		.call(axis)
		.style('font-size', 14);
	// d3.select('.domain').attr('stroke-width', 1);

	if (noThreshold) {
		return;
	}

	// sliding threshold bar
	var cutoff = svg.append('rect').attr('x', tx - 2).attr('y', topY - 10)
		.attr('width', 3).attr('height', height - topY).style('fill','white');

	var thresholdLabel = svg.append('text').text('loan threshold: 50')
		.attr('x', tx)
		.attr('y', 40)
		.attr('text-anchor', 'middle')
		.style('fill','white');

	function setThreshold(t, eventFromUser) {
		t = Math.max(0, Math.min(t, 100));
		if (eventFromUser) {
			t = HISTOGRAM_BUCKET_SIZE * Math.round(t / HISTOGRAM_BUCKET_SIZE);
		} else {
			tx = Math.round(scale(t));
		}
		tx = Math.max(0, Math.min(width - 4, tx));
		var rounded = SIDE * Math.round(tx / SIDE);
		cutoff.attr('x', rounded);
		var labelX = Math.max(50, Math.min(rounded, width - 70));
		thresholdLabel.attr('x', labelX).text('loan threshold: ' + t);
		svg.selectAll('.icon').call(defineIcon);
	}
	var drag = d3.drag()
		.on('drag', function() {
			var oldTx = tx;
			tx += d3.event.dx;
			var t = scale.invert(tx);
			setThreshold(t, true);
			if (tx != oldTx) {
				model.classify(t);
				model.notifyListeners('histogram-drag');
			}
		});
	svg.call(drag);
	model.addListener(function(event) {
		for (var i = 0; i < items.length; i++) {
			items[i].predicted = items[i].score >= model.threshold ? 1 : 0;
		}
		setThreshold(model.threshold, event == 'histogram-drag');
	});
}

// draw full legend for histogram, with all four possible
// categories of people
function createHistogramLegend(id, category) {
	var width = HISTOGRAM_WIDTH;
	var height = HISTOGRAM_LEGEND_HEIGHT;
	var centerX = width / 2;
	var boxSide = 16;
	var centerPad = 1;
	var adjY = 17; //adjustment y on legend to match with "Color"

	// create svg
	var svg = d3.select('#' + id).append('svg')
		.attr('width', width)
		.attr('height', height);

	// create boxes
	svg.append('rect').attr('width', boxSide).attr('height', boxSide)
		.attr('x', centerX - boxSide - centerPad).attr('y', boxSide + adjY)
		.attr('fill', itemColor(category, 0))
		.attr('fill-opacity', itemOpacity(1));
	svg.append('rect').attr('width', boxSide).attr('height', boxSide)
		.attr('x', centerX + centerPad).attr('y', boxSide + adjY)
		.attr('fill', itemColor(category, 1))
		.attr('fill-opacity', itemOpacity(1));

	svg.append('rect').attr('width', boxSide).attr('height', boxSide)
		.attr('x', centerX - boxSide - centerPad).attr('y', 0 + adjY)
		.attr('fill', itemColor(category, 0))
		.attr('fill-opacity', itemOpacity(0));
	svg.append('rect').attr('width', boxSide).attr('height', boxSide)
		.attr('x', centerX + centerPad).attr('y', 0 + adjY)
		.attr('fill', itemColor(category, 1))
		.attr('fill-opacity', itemOpacity(0));

	// draw text
	var textPad = 4;
	svg.append('text')
		.text('denied loan / would pay back')
		.attr('x', centerX - boxSide - textPad)
		.attr('y', 2 * boxSide - textPad + adjY)
		.attr('text-anchor', 'end')
		.style('fill', '#6c757d');
	svg.append('text')
		.text('denied loan / would default')
		.attr('x', centerX - boxSide - textPad)
		.attr('y', boxSide - textPad + adjY)
		.attr('text-anchor', 'end')
		.style('fill', '#6c757d');

	svg.append('text')
		.text('granted loan / pays back')
		.attr('x', centerX + boxSide + textPad)
		.attr('y', 2 * boxSide - textPad + adjY)
		.attr('text-anchor', 'start')
		.style('fill', '#6c757d');
	svg.append('text')
		.text('granted loan / defaults')
		.attr('x', centerX + boxSide + textPad)
		.attr('y', boxSide - textPad + adjY)
		.attr('text-anchor', 'start')
		.style('fill', '#6c757d');

}

// a much simpler legend, used in the first diagram,
// with only two categories of people and a different layout
function createSimpleHistogramLegend(id, category) {
	var width = HISTOGRAM_WIDTH;
	var height = HISTOGRAM_LEGEND_HEIGHT;
	var centerX = width / 2;
	var boxSide = 16; //box width and height
	var centerPad = 1;
	var lx = 30;
	var adjY = 17; //adjustment y on legend to match with "Color"

	// create svg
	var svg = d3.select("#" + id).append('svg')
		.attr('width', width)
		.attr('height', height);

	// create boxes
	svg.append('rect').attr('width', boxSide).attr('height', boxSide)
		.attr('x', centerX + centerPad).attr('y', 0 + adjY)
		.attr('fill', itemColor(category, 1))
		.attr('fill-opacity', itemOpacity(1));
	svg.append('rect').attr('width', boxSide).attr('height', boxSide)
		.attr('x', lx).attr('y', 0 + adjY)
		.attr('fill', itemColor(category, 1))
		.attr('fill-opacity', itemOpacity(0));

	// drow text
	var textPad = 4;
	svg.append('text')
		.text('would pay back loan')
		.attr('x', centerX + boxSide + textPad)
		.attr('y', boxSide - textPad + adjY)
		.attr('text-anchor', 'start')
		.style('fill', '#6c757d');
	svg.append('text')
		.text('would default on loan')
		.attr('x', lx + boxSide + textPad)
		.attr('y', boxSide - textPad + adjY)
		.attr('text-anchor', 'start')
		.style('fill', '#6c757d');
}

// create a pie chart
function createPie(id, values, colors, svg, ox, oy, radius) {
	var angles = [];
	function makeAngles(values) {
		var total = 0;
		for (var i = 0; i < values.length; i++) {
			total += values[i];
		}
		var sum = 0;
		for (var i = 0; i < values.length; i++) {
			var start = 2 * Math.PI * sum / total;
			sum += values[i];
			var end = 2 * Math.PI * sum / total;
			angles[i] = [start, end];
		}
	}
	makeAngles(values);
    var slices = svg.selectAll('.slice-' + id);
	function makeArc(d) {
		return d3.arc()
			.innerRadius(0)
			.outerRadius(radius)
			.startAngle(d[0]).endAngle(d[1])();
	}
	slices.data(angles).enter().append('path')
		.attr('class', 'slice-' + id)
		.attr('d', makeArc)
		.attr('fill', function(d, i) {return colors[i]})
		.attr('transform', 'translate(' + ox + ',' + oy + ')');
	// console.log(colors)
	return function(newValues) {
		makeAngles(newValues);
		svg.selectAll('.slice-' + id)
			.data(angles)
			.attr('d', makeArc);
	}
}

// create a nice label for percentages; the return value is a callback
// to update the number
function createPercentLabel(svg, x, y, text, labelClass, statClass) {
	var label = svg.append('text').text(text)
		.attr('x', x).attr('y', y).attr('class', labelClass).style('fill','white');
	var labelWidth = label.node().getComputedTextLength();
	var stat = svg.append('text').text('')
		.attr('x', x + labelWidth + 4).attr('y', y).attr('class', statClass);

	// return a function that updates the label
	return function(value) {
		var formattedValue = Math.round(100 * value) + '%';
		stat.text(formattedValue).style('fill','white');
	}
}

// helper for multiple explanations
function explanation(svg, lines, x, y) {
	lines.forEach(function(line) {
		svg.append('text').text(line)
			.attr('x', x).attr('y', y += 16).style('fill', '#6c757d');
	});
}

// create two pie charts: 1. for all classification rates
// and 2. true positive rates
function createRatePies(id, model, palette, includeAnnotations) {
	var width = 420;
	var lx = 0;
	var height = 200;
	var svg = d3.select('#' + id).append('svg')
		.attr('width', width)
		.attr('height', height);

	// svg = svg.append('g').attr('transform', 'translate(10,0)');
	// create 2 pie charts
	var tprColors = [palette[0], palette[2]];
	var cy = 130;
	var tprPie = createPie('tpr-' + id, [1,1], tprColors, svg, 55, cy, 55);
	var allPie = createPie('all-' + id, [1,1,1,1], palette, svg, 250, cy, 55);
	var topY = 30;

	// create label
	var tprLabel = createPercentLabel(svg, lx, topY, 'True Positive Rate',
		'pie-label', 'pie-number');
	var posLabel = createPercentLabel(svg, width / 2, topY, 'Positive Rate',
		'pie-label', 'pie-number');		

	// add explanations of positive rates
	explanation(svg, ['percentage of paying', 'applications getting loans'],
		0, topY);
	explanation(svg, ['percentage of all', 'applications getting loans'],
		width / 2, topY);

	model.addListener(function() {
		var items = model.items;
		tprPie([countMatches(items, 1, 0),
				countMatches(items, 1, 1)]);
		allPie([countMatches(items, 1, 0), countMatches(items, 0, 0),
				countMatches(items, 1, 1), countMatches(items, 0, 1)]);
		tprLabel(model.tpr);
		posLabel(model.positiveRate);
	});
}

// creates matrix view of dots representing correct and incorrect items
function createCorrectnessMatrix(id, model) {
	var width = 420;
	var height = 200;
	var correct, incorrect;
	function layout() {
		correct = model.items.filter(function(item) {
			return item.value == item.predicted;
		});
		incorrect = model.items.filter(function(item) {
			return item.value != item.predicted;
		});
		gridLayout(correct, 2, 80);
		gridLayout(incorrect, width / 2 + 4, 80);
	}

	layout();
	var svg = createIcons(id, model.items, width, height, LEFT_PAD);

	// add label
	var topY = 15;
	var correctLabel = createPercentLabel(svg, 0, topY, 'Correct',
		'pie-label', 'pie-number');
	var incorrectLabel = createPercentLabel(svg, width / 2 + 4, topY, 'Incorrect',
		'pie-label', 'pie-number');

	// add explanation of correct decisions
	explanation(svg, ['loans granted to paying',
		'applicants and denied', 'to defaulters'], 0, topY);
	explanation(svg, ['loans denied to paying',
		'applicants and granted', 'to defaulters'], width / 2 + 4, topY);

	// add explanation of incrrect
	model.addListener(function() {
		layout();
		correctLabel(correct.length / model.items.length);
		incorrectLabel(incorrect.length / model.items.length);
		svg.selectAll('.icon').call(defineIcon);
	});
}