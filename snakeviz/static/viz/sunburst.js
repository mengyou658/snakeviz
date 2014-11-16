// This contains the code that renders and controls
// the sunburst visualization.

// Copied, then modified, from http://www.jasondavies.com/coffee-wheel/

var width = 0.8 * Math.min(window.innerHeight, window.innerWidth),
    height = width,
    radius = width / 2,
    scale = d3.scale.category20c()   // colors

var color = function color(d) {
  return scale(d.name);
}

var make_vis_obj = function make_vis_obj () {
  return d3.select("#chart")
    .style('margin-left', 'auto')
    .style('margin-right', 'auto')
    .append("svg:svg")
    .attr("width", width)
    .attr("height", height)
    .append("svg:g")
    .attr("id", "container")
    .attr("transform", "translate(" + radius + "," + radius + ")");
}
var vis = make_vis_obj();

var reset_vis = function reset_vis () {
  // Remove the current figure
  d3.select('svg').remove();

  // Make and draw the new figure
  vis = make_vis_obj();
}

var partition = d3.layout.partition()
  .size([2 * Math.PI, radius * radius])
  .value(function(d) { return d.size; });

var y = d3.scale.linear().domain([0, radius * radius]).range([0, radius]);
var arc = d3.svg.arc()
    .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, d.x)); })
    .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, d.x + d.dx)); })
  .innerRadius(function(d) { return y(d.y); })
  .outerRadius(function(d) { return y(d.y + d.dy); });

var tooltipText = function tooltipText(d, i) {
  return d.name + ' [' + d.cumulative.toPrecision(3) + 's]';
};

var click = function click(d) {
  // check whether we need to do anything
  // (e.g. that the user hasn't clicked on the original root node)
  if (d.name === sv_root_func_name) {
    return;
  }

  var stack_last = _.last(sv_call_stack);
  if (d.name === stack_last) {
    // need to go up a level in the call stack
    sv_call_stack.pop();
    var new_root = _.last(sv_call_stack);
  } else {
    var new_root = d.name;

    // need to construct a new call stack
    // go up the tree until we hit the tip of the call stack
    var this_node = d;
    var local_stack = [new_root];
    while (this_node.parent != null) {
      if (this_node.parent.name === stack_last) {
        // extend the call stack with what we've accumulated
        local_stack.reverse();
        sv_call_stack = sv_call_stack.concat(local_stack);
        break;
      } else {
        local_stack.push(this_node.parent.name);
        this_node = this_node.parent;
      }
    }
  }

  //figure out the new parent name
  if (sv_call_stack.length === 1) {
    var new_parent_name = null;
  } else {
    var new_parent_name = _.first(_.last(sv_call_stack, 2));
  }

  // Create new JSON for drawing a vis from a new root
  var heirarchy = sv_build_heirarchy(
    profile_data, new_root, sv_heirarchy_depth(), sv_base_size, new_parent_name);

  reset_vis();
  drawSunburst(heirarchy);

  // Activate the reset button if we aren't already at the root node
  // And deactivate it if this is the root node
  if (new_root !== sv_root_func_name) {
    d3.select('#resetbutton').node().removeAttribute('disabled');
  } else {
    d3.select('#resetbutton').property('disabled', 'True');
  }
}

var drawSunburst = function drawSunburst(json) {
  // For efficiency, filter nodes to keep only those large enough to see.
  var nodes = partition.nodes(json)
    .filter(function(d) {
      return (d.dx > 0.005); // 0.005 radians = 0.29 degrees
    });

  var path = vis.data([json]).selectAll("path")
      .data(nodes)
      .enter().append("svg:path")
      .attr("id", function(d, i) { return "path-" + i; })
      .attr("d", arc)
      .attr("fill-rule", "evenodd")
      .style("fill", color)
      .style("stroke", "#fff")
      .on("click", click)
      .call(d3helpertooltip(tooltipText));
};

var resetVis = function resetViz() {
  // Create new JSON for drawing a vis from a new root
  var heirarchy = sv_build_heirarchy(
    profile_data, sv_root_func_name, sv_heirarchy_depth(), sv_base_size);

  reset_vis();
  drawSunburst(heirarchy);

  // Reset the call stack
  sv_call_stack = [sv_root_func_name];

  d3.select('#resetbutton').property('disabled', 'True');
};
d3.select('#resetbutton').on('click', resetVis);


var sv_depth_changed = function sv_depth_changed() {
  // Create new JSON for drawing a vis from a new root
  var heirarchy = sv_build_heirarchy(
    profile_data, _.last(sv_call_stack), sv_heirarchy_depth(), sv_base_size);

  reset_vis();
  drawSunburst(heirarchy);
}
d3.select('#sv-depth-select').on('change', sv_depth_changed);
