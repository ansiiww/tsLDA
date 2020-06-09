import React, { Component } from 'react'; 
import './App.css';
import * as d3 from 'd3';
import plotMatrix from './Correlation.js';

var XRegExp = require('xregexp')

// Where is it used?
// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
if (!Object.keys) {
  Object.keys = (function() {
    'use strict';
    var hasOwnProperty = Object.prototype.hasOwnProperty,
        hasDontEnumBug = !({ toString: null }).propertyIsEnumerable('toString'),
        dontEnums = [
          'toString',
          'toLocaleString',
          'valueOf',
          'hasOwnProperty',
          'isPrototypeOf',
          'propertyIsEnumerable',
          'constructor'
        ],
        dontEnumsLength = dontEnums.length;

    return function(obj) {
      if (typeof obj !== 'function' && (typeof obj !== 'object' || obj === null)) {
        throw new TypeError('Object.keys called on non-object');
      }

      var result = [], prop, i;

      for (prop in obj) {
        if (hasOwnProperty.call(obj, prop)) {
          result.push(prop);
        }
      }

      if (hasDontEnumBug) {
        for (i = 0; i < dontEnumsLength; i++) {
          if (hasOwnProperty.call(obj, dontEnums[i])) {
            result.push(dontEnums[i]);
          }
        }
      }
      return result;
    };
  }());
}

// Used for numTopics
/** This function is copied from stack overflow: http://stackoverflow.com/users/19068/quentin */
var QueryString = function () {
  // This function is anonymous, is executed immediately and
  // the return value is assigned to QueryString!
  var query_string = {};
  var query = window.location.search.substring(1);
  var vars = query.split("&");
  for (var i=0;i<vars.length;i++) {
    var pair = vars[i].split("=");
    // If first entry with this name
    if (typeof query_string[pair[0]] === "undefined") {
      query_string[pair[0]] = pair[1];
    // If second entry with this name
    } else if (typeof query_string[pair[0]] === "string") {
      var arr = [ query_string[pair[0]], pair[1] ];
      query_string[pair[0]] = arr;
    // If third or later entry with this name
    } else {
      query_string[pair[0]].push(pair[1]);
    }
  }
    return query_string;
} ();

class App extends Component {
  state = {
    // Vocabulary statistics

    // Needed by reset & parseline
    vocabularySize: 0,

    // needed by reset & parseline, changeNumTopics
    vocabularyCounts: {},

    //needed by reset
    displayingStopwords: false,
    sortVocabByTopic: false,
    specificityScale: d3.scaleLinear().domain([0,1]).range(["#ffffff", "#99d8c9"]),

    // Topic model parameters

    // needed by reset & sortTopicWords, changeNumTopics
    numTopics: 0, // run findNumTopics upon mount

    // required by reset & ready & parseline
    stopwords: {},

    // required by reset, changeNumTopics
    completeSweeps: 0,
    requestedSweeps: 0,

    // in reset, changeNumTopics
    selectedTopic: -1,

    // Needed by reset & parseline & sortTopicWords, changeNumTopics
    wordTopicCounts: {},

    // Needed by reset & sortTopicWords, changeNumTopics
    topicWordCounts: [],

    // Needed by reset & parseline, changeNumTopics
    tokensPerTopic: [], // set to zeros(numTopics)

    // in reset, changeNumTopics
    topicWeights: [], // set to zeros(numTopics)

    // used by reset & parseline, changeNumTopics
    documents: [],

    // used by sortTopicWords
    byCountDescending: function (a,b) { return b.count - a.count; },

    // used by parseLine
    truncate: function(s) { return s.length > 300 ? s.substring(0, 299) + "..." : s; },
    wordPattern: XRegExp("\\p{L}[\\p{L}\\p{P}]*\\p{L}", "g"),

    // Constants for calculating topic correlation. A doc with 5% or more tokens in a topic is "about" that topic.
    correlationMinTokens: 2, // used by getTopicCorrelations
    correlationMinProportion: 0.05, // used by getTopicCorrelations  

    topNWords: function(wordCounts, n) { return wordCounts.slice(0,n).map( function(d) { return d.word; }).join(" "); }, // Used in timeSeries

  };

  findNumTopics() {
    this.setState({numTopics: QueryString.topics ? parseInt(QueryString.topics) : 25});
    if (isNaN(this.state.numTopics)) {
    alert("The requested number of topics [" + QueryString.topics + "] couldn't be interpreted as a number");
    this.setState({numTopics:25});
    }
  }

  zeros(n) {
    var x = new Array(n);
    for (var i = 0; i < n; i++) { x[i] = 0.0; }
    return x;
  }

  queueLoad() { 
    this.reset();
    Promise.all([
      this.getStoplistUpload(),
      this.getDocsUpload()
      ]).then(function([stops, lines]) {this.ready(null, stops, lines)}
      )
  }

  reset() {
    this.vocabularySize = 0;
    this.vocabularyCounts = {};
    this.displayingStopwords = false;
    this.sortVocabByTopic = false;
    this.specificityScale = d3.scaleLinear().domain([0,1]).range(["#ffffff", "#99d8c9"]);
    
    d3.select("#num-topics-input").property("value", this.numTopics);
  
    this.stopwords = {};
  
    this.completeSweeps = 0;
    this.requestedSweeps = 0;
    d3.select("#iters").text(this.completeSweeps);
  
    this.selectedTopic = -1;
  
    this.wordTopicCounts = {};
    this.topicWordCounts = [];
    this.tokensPerTopic = this.zeros(this.numTopics);
    this.topicWeights = this.zeros(this.numTopics);
    
    this.documents = [];
    d3.selectAll("div.document").remove();
  }
  
  ready(error, stops, lines) {
    if (error) { alert("File upload failed. Please try again."); throw error;}
    else {
      // Create the stoplist
      console.log(stops);
      stops.split(/\s+/).forEach(function (w) { console.log(w); this.stopwords[w] = 1; });
  
      // Load documents and populate the vocabulary
      lines.split("\n").forEach(this.parseLine);
  
      this.sortTopicWords();
      displayTopicWords();
      toggleTopicDocuments(0);
      //plotGraph();
      
      plotMatrix();
      vocabTable();
      createTimeSVGs();
      timeSeries();
    }
  }
  
  parseLine ( line ) {
    if (line == "") { return; }
    var docID = this.documents.length;
    var docDate = "";
    var fields = line.split("\t");
    var text = fields[0];  // Assume there's just one field, the text
    if (fields.length == 3) {  // If it's in [ID]\t[TAG]\t[TEXT] format...
      docID = fields[0];
      docDate = fields[1]; // do not interpret date as anything but a string
      text = fields[2];
    }
  
    var tokens = [];
    var rawTokens = text.toLowerCase().match(this.wordPattern);
    if (rawTokens == null) { return; }
    var topicCounts = this.zeros(this.numTopics);
  
    rawTokens.forEach(function (word) {
      if (word !== "") {
        var topic = Math.floor(Math.random() * this.numTopics);
  
        if (word.length <= 2) { this.stopwords[word] = 1; }
  
        var isStopword = this.stopwords[word];
        if (isStopword) {
          // Record counts for stopwords, but nothing else
          if (! this.vocabularyCounts[word]) {
            this.vocabularyCounts[word] = 1;
          }
          else {
            this.vocabularyCounts[word] += 1;
          }
        }
        else {
          this.tokensPerTopic[topic]++;
          if (! this.wordTopicCounts[word]) {
            this.wordTopicCounts[word] = {};
            this.vocabularySize++;
            this.vocabularyCounts[word] = 0;
          }
          if (! this.wordTopicCounts[word][topic]) {
            this.wordTopicCounts[word][topic] = 0;
          }
          this.wordTopicCounts[word][topic] += 1;
          this.vocabularyCounts[word] += 1;
          this.topicCounts[topic] += 1;
        }
        tokens.push({"word":word, "topic":topic, "isStopword":isStopword });
      }
    });
    
    // Here for today
    this.documents.push({ "originalOrder" : this.documents.length, "id" : docID, "date" : docDate, "originalText" : text, "tokens" : tokens, "topicCounts" : topicCounts});
    d3.select("div#docs-page").append("div")
       .attr("class", "document")
       .text("[" + docID + "] " + this.truncate(text));
  }

  // used by addStop, removeStop in vocab, saveTopicKeys in downloads, sweep in sweep
  sortTopicWords() {
    this.topicWordCounts = [];
    for (var topic = 0; topic < this.numTopics; topic++) {
      this.topicWordCounts[topic] = [];
    }
  
    for (var word in this.wordTopicCounts) {
      for (var topic in this.wordTopicCounts[word]) {
        this.topicWordCounts[topic].push({"word":word, "count":this.wordTopicCounts[word][topic]});
      }
    }
  
    for (var topic = 0; topic < this.numTopics; topic++) {
      this.topicWordCounts[topic].sort(this.byCountDescending);
    }
  }

  // This function is the callback for "input", it changes as we move the slider
  //  without releasing it.
  updateTopicCount(input) {
    d3.select("#num_topics_display").text(input.value);
  }

  // This function is the callback for "change", it only fires when we release the
  //  slider to select a new value.
  onTopicsChange(input) {
    console.log("Changing # of topics: " + input.value);
    
    var newNumTopics = Number(input.value);
    if (! isNaN(newNumTopics) && newNumTopics > 0 && newNumTopics !== this.numTopics) {
      this.changeNumTopics(Number(input.value));
    }
  }

  changeNumTopics(numTopics_) {
    this.numTopics = numTopics_;
    this.selectedTopic = -1;
    
    this.completeSweeps = 0;
    this.requestedSweeps = 0;
    d3.select("#iters").text(this.completeSweeps);
    
    this.wordTopicCounts = {};
    Object.keys(this.vocabularyCounts).forEach(function (word) { this.wordTopicCounts[word] = {} });
    
    this.topicWordCounts = [];
    this.tokensPerTopic = this.zeros(this.numTopics);
    this.topicWeights = this.zeros(this.numTopics);
    
    this.documents.forEach( function( currentDoc, i ) {
      currentDoc.topicCounts = this.zeros(this.numTopics);
      for (var position = 0; position < currentDoc.tokens.length; position++) {
        var token = currentDoc.tokens[position];
        token.topic = Math.floor(Math.random() * this.numTopics);
        
        if (! token.isStopword) {
          this.tokensPerTopic[token.topic]++;
          if (! this.wordTopicCounts[token.word][token.topic]) {
            this.wordTopicCounts[token.word][token.topic] = 1;
          }
          else {
            this.wordTopicCounts[token.word][token.topic] += 1;
          }
          currentDoc.topicCounts[token.topic] += 1;
        }
      }
    });

    this.sortTopicWords();
    displayTopicWords();
    reorderDocuments();
    vocabTable();
    
    // Restart the visualizations
    createTimeSVGs();
    timeSeries();
    plotMatrix({  numTopics: this.numTopics,
                  documents: this.documents,
                  correlationMinTokens: this.correlationMinTokens,
                  correlationMinProportion: this.correlationMinProportion,
                  topicWordCounts: this.topicWordCounts,
                  topNWords: this.topNWords,
                  zeros: this.zeros});
  }

  componentDidMount() {
    this.findNumTopics();
    // Set upon initialisation, changed to new numTopics in reset
    d3.select("#num-topics-input").attr("value", this.state.numTopics);
    
    this.setState({tokensPerTopic: this.zeros(this.state.numTopics)});
    this.setState({topicWeights: this.zeros(this.state.numTopics)});
    
    // used by parseLine
    d3.select("#docs-tab").on("click", function() {
      d3.selectAll(".page").style("display", "none");
      d3.selectAll("ul li").attr("className", "");
      d3.select("#docs-page").style("display", "block");
      d3.select("#docs-tab").attr("className", "selected");

    this.queueLoad();
    });
  }
  
  render() {
    console.log(this.state.numTopics)
    return (
      <div id="app">
      <div id="tooltip"></div>

      <div id="main">
      <div id="form" className="top">
        <button id="sweep">Run 50 iterations</button>
        Iterations: <span id="iters">0</span>

      <span id="num_topics_control">Train with <input id="num-topics-input" type="range" name="topics" value="25" min="3" max="100" onInput="updateTopicCount(this)" onChange="onTopicsChange(this)"/> <span id="num_topics_display">25</span> topics</span>
      </div>

      <div className="sidebar">

      <div id="topics" className="sidebox">
      </div>

      </div>

      <div id="tabwrapper">
      <div className="tabs">
      <ul>
      <li id="docs-tab" className="selected">Topic Documents</li>
      <li id="corr-tab">Topic Correlations</li>
      <li id="ts-tab">Time Series</li>

      <li id="dl-tab">Downloads</li>
      <li id="vocab-tab">Vocabulary</li>
      </ul>
      </div>
      <div id="pages">

      <div id="docs-page" className="page">
        <div className="upload">
        <form onSubmit="event.preventDefault(); queueLoad();">
          <div>Use a different collection:</div>
          <div>Documents <input id="docs-file-input" type="file" onChange="onDocumentFileChange(this)" size="10"/></div>
          <div>Stoplist  <input id="stops-file-input" type="file" onChange="onStopwordFileChange(this)" size="10"/></div>
          <div><button id="load-inputs">Upload</button></div>
        </form>
        </div>
        <div className="help">Documents are sorted by their proportion of the currently selected topic, biased to prefer longer documents.</div>
        
      </div>

      <div id="vocab-page" className="page">
        <div className="help">Words occurring in only one topic have specificity 1.0, words evenly distributed among all topics have specificity 0.0. <button id="showStops">Show stopwords</button>
      <button id="sortVocabByTopic">Sort by topic</button>
        </div>
      <table id="vocab-table">
      <thead><tr><th>Word</th><th>Frequency</th><th>Topic Specificity</th><th>Stoplist</th></tr></thead>
      <tbody></tbody>
      </table>
      </div>

      <div id="ts-page" className="page">
        <div className="help">Documents are grouped by their "date" field (the second column in the input file). These plots show the average document proportion of each topic at each date value. Date values are <i>not</i> parsed, but simply sorted in the order they appear in the input file.</div>
        <div className="help"></div>
      </div>

      <div id="corr-page" className="page">
        <div className="help">Topics that occur together more than expected are blue, topics that occur together less than expected are red.</div>
      </div>

      <div id="dl-page" className="page">
        <div className="help">Each file is in comma-separated format.</div>
        <ul>
        <li><a id="doctopics-dl" href="javascript:;" download="doctopics.csv" onClick="saveDocTopics()">Document topics</a></li>
        <li><a id="topicwords-dl" href="javascript:;" download="topicwords.csv" onClick="saveTopicWords()">Topic words</a></li>
        <li><a id="keys-dl" href="javascript:;" download="keys.csv" onClick="saveTopicKeys()">Topic summaries</a></li>
        <li><a id="topictopic-dl" href="javascript:;" download="topictopic.csv" onClick="saveTopicPMI()">Topic-topic connections</a></li>
        <li><a id="graph-dl" href="javascript:;" download="gephi.csv" onClick="saveGraph()">Doc-topic graph file (for Gephi)</a></li>
        <li><a id="state-dl" href="javascript:;" download="state.csv" onClick="saveState()">Complete sampling state</a></li>
        </ul>
      </div>

      </div>
      </div>
      </div>
      </div>
    );
  };
}

export default App;