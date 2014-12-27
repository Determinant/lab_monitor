var ajax_site = 'ajax';
var refresh_rate = 3000;
var send_timeout = 20000;
var retry_rate = 3000;

function Blocker(sleeper) {
    this.counter = 0;
    this.waiting = false;
    this.sleeper = sleeper;
}

Blocker.prototype.setHook = function() {
    var blocker = this;
    return function() {
        blocker.counter++;
    }
}
Blocker.prototype.setNotifier = function(cb) {
    var blocker = this;
    return function() {
        cb.apply(this, arguments);
        if (--blocker.counter == 0 && blocker.waiting)
            blocker.sleeper();
    }
};

Blocker.prototype.go = function() {
    if (this.counter == 0)
        this.sleeper();
    this.waiting = true;
}

function send_request(on_success) {
    $.ajax({
            url: ajax_site,
            type: 'GET',
            cache: false,
            dataType: 'json',
            async: true,
            success: on_success,
            timeout: send_timeout,
            error: function(a, b, c) {
                console.log("failed while connecting, reason: " + b);
                setTimeout(function() {
                        send_request(on_success);
                }, retry_rate);
            }
    });
}

function hex(x) {
    return ("0" + parseInt(x).toString(16)).slice(-2);
}

function random_range(min, max) {
    return Math.random() * (max - min) + min;
}

function random_color() {
    var r = (random_range(0, 200) + 150) / 2;
    var g = (random_range(0, 200) + 150) / 2;
    var b = (random_range(0, 200) + 150) / 2;
    return "#" + hex(r) + hex(g) + hex(b);
}

function LineGraph() {}

LineGraph.prototype.recalc_y_domain = function(data) {
    var min = d3.min(data, function(d) { return d.y; });
    var max = d3.max(data, function(d) { return d.y; });
    var delta = max - min;
    this.y.domain([min - delta / 2.0, max + delta / 3.0]);
}

LineGraph.prototype.recalc_domain = function(data) {
    this.x.domain(d3.extent(data, function(d) { return d.x; }));
    this.recalc_y_domain(data);
}

LineGraph.prototype.parse_data = function(d) {
    var data = [];
    for (var i = 0; i < d.records.length; i++)
    {
        var rec = d.records[i];
        data.push({x: i, y: +rec.rec[0], rid: rec.rid});
    }
    return data;
}

LineGraph.prototype.update = function(d, i, b) {
    var graph = this;
    var data = this.parse_data(d);
    if (data.length == 0) return;
    var pdata = this.pdata;
    var svg = d3.select(this.elem).select("svg");
    var path = svg.select(".line");

    var shift = pdata.length ? data[0].rid - pdata[0].rid : 0;
    var add = pdata.length ? data[data.length - 1].rid - pdata[pdata.length - 1].rid : 0;
    if (pdata.length == 0 || pdata[pdata.length - 1].rid < data[0].rid ||
        pdata[0] > data[data.length - 1].rid || shift < 0 || add < 0)
    {
        if (data.length == 1)
        {
            data = [];
            console.log("clear");
        }
        this.recalc_domain(data);
        path.transition()
            .duration(200)
            .style("opacity", 1e-6)
            .transition()
            .attr("d", graph.valueline(data))
            .transition()
            .duration(200)
            .style("opacity", 1)
            .each(b.setHook())
            .each("end", b.setNotifier(function() {
                graph.pdata = data;
                console.log("refresh complete");
            }));
        console.log("refresh started");
    }
    else
    {
        this.recalc_domain(pdata);
        //console.log("shift: " + shift + "add: " + add);
        data = this.pdata.concat(data.slice(data.length - add, data.length));
        for (var i = 0; i < data.length; i++)
            data[i].x = i;
        this.recalc_y_domain(data);
        path.transition().duration(750)
        .attr("d", graph.valueline(data))
        .transition()
        .duration(750)
        .attr("transform", "translate(" + this.x(-shift) + ")")
        .each(b.setHook())
        .each("end", b.setNotifier(function() {
            for (var i = 0; i < shift; i++)
                data.shift();
            for (var i = 0; i < data.length; i++)
                data[i].x = i;
            graph.pdata = data;
            d3.select(this).attr("d", graph.valueline(data))
                            .attr("transform", "translate(" + graph.x(0) + ")");
        }));
    }
    svg.transition()
       .duration(750)
       .select(".x.axis")
       .call(this.xAxis);
    svg.transition()
       .duration(750)
       .select(".y.axis")
       .call(this.yAxis);
}

LineGraph.prototype.setup = function(elem, d, i, b) {
    var graph = this;
    var data = this.parse_data(d);
    this.elem = elem;
    var margin = {top: 10, right: 0, bottom: 50, left: 30};
    // Adds the svg canvas
    var svg = d3.select(this.elem)
                .append("svg")
                .attr("width", "100%")
                .attr("height", "100%")
                .append("g")
                .attr("transform",
                    "translate(" + margin.left + "," + margin.top + ")");
    var width = 500 - margin.left - margin.right;
    var height = 250 - margin.top - margin.bottom;
    // Set the ranges
    this.x = d3.scale.linear().range([0, width]);
    this.y = d3.scale.linear().range([height, 0]);
    // Scale the range of the data
    this.recalc_domain(data);
    // Define the axes
    this.xAxis = d3.svg.axis().scale(this.x)
                    .orient("bottom").ticks(5).tickFormat(d3.format("d"));

    this.yAxis = d3.svg.axis().scale(this.y)
                    .orient("left").ticks(5);
    // Define the line
    this.valueline = d3.svg.line()
                        .x(function(d) { return this.x(d.x); })
                        .y(function(d) { return this.y(d.y); });
    /*
    svg.append("text")
        .attr("x", (width / 2))
        .attr("y", 0 - (margin.top / 2))
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("text-decoration", "none")
        .text(d.name);
    */
    // Add the X Axis
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(this.xAxis);

    // Add the Y Axis
    svg.append("g")
        .attr("class", "y axis")
        .call(this.yAxis);

    svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

    d3.select(this.elem).transition()
        .duration(750)
        .style("height", height + margin.top + margin.bottom + "px")
        .each(b.setHook())
        .each("end", b.setNotifier(function() {
                    // Get the data
            var path = svg.append("g")
                            .attr("clip-path", "url(#clip)")
                            .append("path");

            path.attr("class", "line")
                .style("stroke", random_color)
                .attr("d", graph.valueline(data));
            var totalLength = path.node().getTotalLength();
            path.attr("stroke-dasharray", totalLength + " " + totalLength)
                .attr("stroke-dashoffset", totalLength)
                .transition()
                .duration(2000)
                .ease("linear")
                .attr("stroke-dashoffset", 0)
                .each(b.setHook())
                .each("end", b.setNotifier(function() {
                    path.attr("stroke-dasharray", "");
                }));
            graph.pdata = data;
        }));
}

function ListGraph() {}

ListGraph.prototype.parse_data = function(d) {
    var data = [];
    for (var i = 0; i < d.records.length; i++)
    {
        var rec = d.records[i];
        data.push({rid: rec[0], rec: rec});
    }
    return data;
}

ListGraph.prototype.setup = function(elem, d, i, b) {
    var data = this.parse_data(d);
    var div = d3.select(elem);
    this.elem = elem;
    /*
    div.append("div")
        .style("text-align", "center")
        .append("a")
        .style("font-size", "16px")
        .style("text-decoration", "none")
        .text(d.name);
        */
    var table = d3.select(elem)
                .append("table")
                .attr("class", "listgraph table")
                .style("width", "100%")
                .style("height", "100%");
    this.table = table;
    table.selectAll("tr").data(data)
        .enter().append("tr")
        .selectAll("td").data(function(d) { return d.rec; })
        .enter().append("td")
        .style("opacity", 0)
        .transition().duration(750)
        .style("opacity", 1)
        .text(function(d) { return d; })
        .each(b.setHook())
        .each("end", b.setNotifier(function(){}));
    d3.select(elem)
        //.transition().duration(750)
        .style("height", null);
}

ListGraph.prototype.update = function(d, i, b) {
    var graph = this;
    var data = this.parse_data(d);
    var items = this.table.selectAll("tr").data(data, function(d) { return d.rid; });
    b.setHook()();
    var b0 = new Blocker(b.setNotifier(function() {
        items.order();
    }));

    items.selectAll("td").text(function(d) { return d; });
    items.enter()
        .append("tr")
        .selectAll("td")
        .data(function(d) { return d.rec; })
        .enter()
        .append("td")
        .text(function(d) { return d; });
    items.exit().remove();
    b0.go();
}

var graph_handler = {"linegraph": LineGraph, "listgraph": ListGraph};

function update_jobs(resp, after) {
    resp = Object.keys(resp).map(function(k) { return resp[k] });
    var jobs = d3.select("#jobs").selectAll(".job_graph").data(resp, function(d) { return d.jid; });
    var b = new Blocker(after);
    jobs.each(function(d, i) {
        d3.select(this).select(".job_content").node().handler.update(d, i, b);
    });
    var outer = jobs.enter()
        .append("div")
        .attr("class", "job_graph panel panel-info")
        .style("width", "540px");
    outer.append("div")
        .attr("class", "panel-heading")
        .text(function(d) { return d.name; });
    outer.append("div")
        .attr("class", "job_content panel-body")
        .style("height", "0px")
        .each(function(d, i) {
            this.handler = new graph_handler[d.metadata.type]();
            this.handler.setup(this, d, i, b);
        });
    jobs.exit()
        .style("height", function(d) { return d3.select(this).style("height"); })
        .transition().duration(750)
        .style("height", "0px")
        .each(b.setHook())
        .each("end",b.setNotifier(function(){}))
        .remove();
    b.go();
}

function graph_tick() {
    send_request(function(resp) {
        update_jobs(resp, function() {
            setTimeout(graph_tick, refresh_rate);
        });
    });
}

graph_tick();
