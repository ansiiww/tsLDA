import React, { Component } from 'react'; 
import * as d3 from 'd3';

class VocabTable extends Component {
    constructor(props) {
        super(props);
        this.state = {
          displayingStopwords: false
        };
      }
    
    specificityScale = d3.scaleLinear().domain([0,1]).range(["#ffffff", "#99d8c9"]);


      // used by toggleTopicDocuments in topicdocuments, ready, changeNumTopics in processing, sweep in sweep
    vocabTable() {
      var shouldDisable = this.props.modelIsRunning || null; 
      var format = d3.format(".2g");
      var wordFrequencies = this.mostFrequentWords(this.state.displayingStopwords, this.props.sortVocabByTopic).slice(0, 499);
      var table = d3.select("#vocab-table tbody");
      table.selectAll("tr").remove();
      
      let stopwords = this.props.stopwords;
      let specificity = this.specificity;
      let specificityScale = this.specificityScale;
      let addStop = this.props.addStop;
      let removeStop = this.props.removeStop;

      wordFrequencies.forEach(function (d) {
        var isStopword = stopwords[d.word];
        var score = specificity(d.word);

        var row = table.append("tr");
        row.append("td").text(d.word).style("color", isStopword ? "#444444" : "#000000");
        row.append("td").text(d.count);
        row.append("td").text(isStopword ? "NA" : format(score))
        .style("background-color", specificityScale(score));
        row.append("td").append("button").text(stopwords[d.word] ? "unstop" : "stop")
        .on("click", function () {
          console.log(d.word);
          if (! isStopword) { addStop(d.word); }
          else { removeStop(d.word); }

        })
        .attr("disabled", shouldDisable);
      });
    }
  
    mostFrequentWords(includeStops, sortByTopic) {
      // Convert the random-access map to a list of word:count pairs that
      //  we can then sort.
      var wordCounts = [];
    
      if (sortByTopic) {
        for (let word in this.props.vocabularyCounts) {
          if (this.props.wordTopicCounts[word] &&
            this.props.wordTopicCounts[word][this.props.selectedTopic]) {
            wordCounts.push({"word":word,
                     "count":this.props.wordTopicCounts[word][this.props.selectedTopic]});
          }
        }
      }
      else {
        for (let word in this.props.vocabularyCounts) {
          if (includeStops || ! this.props.stopwords[word]) {
            wordCounts.push({"word":word,
                     "count":this.props.vocabularyCounts[word]});
          }
        }
      }
    
      wordCounts.sort(this.props.byCountDescending);
      return wordCounts;
    }
  
    specificity = (word)=> {

      return 1.0 - (this.entropy(d3.values(this.props.wordTopicCounts[word])) / Math.log(this.props.numTopics));
    }
  
    entropy(counts) {
      counts = counts.filter(function (x) { return x > 0.0; });
      var sum = d3.sum(counts);
      return Math.log(sum) - (1.0 / sum) * d3.sum(counts, function (x) { return x * Math.log(x); });
    }

    setDisplay = (displayingStopwords) => {
      this.setState({displayingStopwords:displayingStopwords})
    }

    setUp = () => {
      let displayingStopwords = this.state.displayingStopwords;
      let sortVocabByTopic = this.props.sortVocabByTopic;
      let setDisplay = this.setDisplay;
      let setSort = this.props.sortbyTopicChange;

      d3.select("#showStops").on("click", function () {
        if (displayingStopwords) {
          this.innerText = "Show stopwords";
          setDisplay(false);
        //   vocabTable();
        }
        else {
          this.innerText = "Hide stopwords";
          setDisplay(true);
        //   vocabTable();
        }
      });
      
      d3.select("#sortVocabByTopic").on("click", function () {
        if (sortVocabByTopic) {
          this.innerText = "Sort by topic";
          setSort(false);
        //   vocabTable();
        }
        else {
          this.innerText = "Sort by frequency";
          setSort(true);
        //   vocabTable();
        }
      });;

    }
  
    componentDidMount() {
      this.vocabTable();
      this.setUp();
    }

    componentDidUpdate(prevProps) {
        this.vocabTable();
        this.setUp();
    }

    shouldComponentUpdate(nextProps, nextState) {
      if (nextProps.update === false) {
          return false
      }
      return true
    }

    render() {
        return (
            <div id="vocab-page" className="page">
                <div className="help">Words occurring in only one topic have specificity 1.0, words evenly distributed among all topics have specificity 0.0.
                    <button id="showStops">Show stopwords</button>
                    <button id="sortVocabByTopic">Sort by topic</button>
                </div>
                <table id="vocab-table">
                    <thead><tr><th>Word</th><th>Frequency</th><th>Topic Specificity</th><th>Stoplist</th></tr></thead>
                    <tbody></tbody>
                </table>
            </div>
        )
    }
}

export default VocabTable
  