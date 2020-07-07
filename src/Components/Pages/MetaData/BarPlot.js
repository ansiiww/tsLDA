import Plot from './Plot'
import { select, mouse } from 'd3-selection'
import {scaleLinear} from 'd3-scale'

class BarPlot extends Plot {
    proportionLabels = .2
    barWidth = this.width/8;

    // Override Plot's functions to render a plot
    createPlot() {
        super.createPlot()
        this.createBars(this.data)
    }

    /**
     * @summary Creates bars from the data
     * @param {Array<{"label":String,"value":Number}>} data 
     * The data to display
     */
    createBars(data) {
        const node = this._rootNode;
        const barBox = select(node).select("#barBox");
        const maxHeight = this.height * (1 - this.proportionLabels);
        const labels = data.map((d) => d["label"]);
        const values = data.map((d) => d["value"]);
        const barSeperation = 1.5;
        const scaleBars = scaleLinear()
            .domain([0,Math.max(...values)])
            .range([maxHeight,0]);
        
        var Tooltip = select(node)
            .append("g")
            .attr("class", "tooltip")
            .style("opacity", 0)
            .style("position", "fixed")

        Tooltip.append("rect")
            .style("background-color", "white")
            .style("border", "solid")
            .style("border-width", "2px")
            .style("border-radius", "5px")
            .style("padding", "5px")
           
        Tooltip.append("text")

        // Three function that change the tooltip when user hover / move / leave a cell
        var mouseover = function(d) {
            Tooltip
                .style("opacity", 1)
            select(this)
                .style("stroke", "black")
                .style("opacity", 1)
        }
        var mousemove = function(d) {
            const svg = this.parentElement.parentElement
            const x = mouse(svg)[0]+70
            const y = mouse(svg)[1]
            Tooltip.select("text")
                .html("Value: " + d)
            
            Tooltip
                .attr("transform", "translate(" + x + "," + y + ")")
                .attr("y", (mouse(svg)[1]) + "px")
        }
        var mouseleave = function(d) {
            Tooltip
                .style("opacity", 0)
            select(this)
                .style("stroke", "none")
                .style("opacity", 0.8)
        }
        // Create bars
        barBox.selectAll("rect")
            .data(values)
            .enter()
            .append("rect")
            .attr("x", (_,i) => {
                return i*barSeperation*this.barWidth + 0.5*this.barWidth})
            .attr("width", this.barWidth)
            .attr("y", (d) => scaleBars(d))
            .attr("height", (d) => maxHeight-scaleBars(d))
            .attr("class", "plot-bar")
            .style("opacity",0.8)
            .on("mouseover", mouseover)
            .on("mousemove", mousemove)
            .on("mouseleave", mouseleave)
        
        // Add labels
        barBox.selectAll("rect")
            .append("text")
            .data(labels)
            .text(d => d)
    }
}

export default BarPlot;