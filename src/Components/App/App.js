import React, { Component } from 'react'; 
import './App.css';
import * as d3 from 'd3';

import {getObjectKeys} from '../../funcs/utilityFunctions'
import LDAModel from '../../LDAModel/LDAModel'

import Correlation from '../Pages/Correlation';
import TopicDoc from '../Pages/TopicDoc/TopicDoc';
import SideBar from '../SideBar';
import VocabTable from '../Pages/VocabTable';
import TimeSeries from '../Pages/TimeSeries';
import NavBar from '../Header/NavBar';
import TopBar from '../Header/TopBar';
import DLPage from '../Pages/DLPage';
import HomePage from '../Pages/HomePage';
import MetaData from '../Pages/MetaData/MetaData';

import stateOfUnionDocs from '../../defaultDocs/stateOfUnionDocs.txt';
import moviePlotsDocs from '../../defaultDocs/wikiMoviePlots.csv';
import yelpReviews from '../../defaultDocs/yelpReviews.csv';
import defaultStops from '../../defaultDocs/stoplist.txt';
import corrTooltip from '../Tooltip/corrTooltip.png';


// This adds the Object.keys() function to some old browsers that don't support it
if (!Object.keys) {
  Object.keys = (getObjectKeys());
}


class App extends Component {
  constructor(props) {
    super(props)

    let startingNumTopics = 25;
    this.state = {
      ldaModel: new LDAModel(startingNumTopics, () => {this.forceUpdate(); console.log("Forced Update")}),

      // The file location of default files
      docName: "Movie Plots",
      documentsURL: moviePlotsDocs,
      stopwordsURL: defaultStops,
      defaultExt: "text/csv",

      // Location to store uploaded files
      documentsFileArray: [],
      stoplistFileArray: [],

      selectedTab: "home-tab",
      sweepParameter: 50,

      update: true,
    };
  };

  downloadModel = () => {
    const fileName = "jsLDA_Model";
    const json = JSON.stringify(this.state.ldaModel);
    const blob = new Blob([json],{type:'application/json'});
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = fileName + ".json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);    
  }

  // Default notes for correlation (placed here to avoid rerendering)
  corNotes = ``;

  // Functions for notes in correlation
  changeNotes = (notes) => {
    this.corNotes = notes;
  }

  provideNotes = () => {
    return this.corNotes;
  }

  // Data and functions for annotations in sidebar (placed here instead of as a state to avoid re-rendering)
  annotations = [];

  changeAnnotation = (text,i) => {
    this.annotations[i] = text;
  }

  resetNotes = (i) => {
    console.log("resetNotes");
    this.annotations = new Array(i);
  }

  /**
   * @summary Gets the annotaion for a topic
   * @param {Number} topic Number of topic to get annotations for
   */
  getAnnotation = (topic) => {
    return this.annotations[topic];
  }


  /**
   * @summary Update the page/tab user is looking at, causing rerender of components
   */
  changeTab = (tabID) => {
    this.setState({
      selectedTab: tabID
    });

    console.log("Tab   is now: " + tabID)
  }

  /**
   * @summary Load in new default document
   */
  onDefaultDocChange = (event) => {
    event.preventDefault();

    let docName = event.target.value;
    this.setState({
      docName: docName,
    });
    
    if(docName === "State Of The Union")
      {
      this.setState({
        documentsURL: stateOfUnionDocs,
        defaultExt: "text/txt"
      });
      }
    else if(docName=== "Movie Plots")
    {
      this.setState({
        documentsURL: moviePlotsDocs,
        defaultExt: "text/csv"
      });
    }
    else if(docName=== "Yelp Reviews")
    {
      this.setState({
        documentsURL: yelpReviews,
        defaultExt: "text/csv"
      });
    }
  }

  

  /**
   * @summary Retrieve doc files from upload component and set documentType
   */
  onDocumentFileChange = (event) => {
    event.preventDefault();

    // Prevent empty file change errors
    if(!event.target.files[0]){return;}

    this.setState({
      documentsFileArray: [Array.prototype.slice.call(event.target.files)],
    });
    this.state.ldaModel.documentType = event.target.files[0].type;
  }

  /**
   * @summary Retrieve stop word files from upload component
   */
  onStopwordFileChange = (event) => {
    event.preventDefault();
    
    // Prevent empty file change errors
    if(!event.target.files[0]){return;}

    this.setState({
      stoplistFileArray: [Array.prototype.slice.call(event.target.files)],
    });

  }

  /**
   * @summary Retrieve model file from upload component
   * @param {Event} event file change event
   */
  onModelFileChange = (event) => {
    event.preventDefault();
    
    // Prevent empty file change errors
    if(!event.target.files[0]){return;}

    this.setState({
      modelFileArray: [Array.prototype.slice.call(event.target.files)],
    });
  }

  onModelUpload = () => {
    let model = new Promise((resolve) => {
      const fileSelection = this.state.modelFileArray[0].slice();
      let reader = new FileReader();
      reader.onload = function() {
        resolve(Object.assign(new LDAModel,JSON.parse(reader.result)));
      };
      reader.readAsText(fileSelection[0]);
    }).then((result) => this.setState({
      ldaModel: result
    }))

    console.log(model)
  }

  /**
   * @summary Returns a promise of the correct stopword text
   * @returns {Promise<String>} stopword text
   *  - first document in documentsFileArray state if it exists
   *  - stopwordsURL resource file otherwise
   */
  getStoplistUpload = () => (new Promise((resolve) => {
    if (this.state.stoplistFileArray.length === 0) {
        resolve(d3.text(this.state.stopwordsURL));
    } else {
      const fileSelection = this.state.stoplistFileArray[0].slice();
      let reader = new FileReader();
      reader.onload = function() {
        resolve(reader.result);
      };
      reader.readAsText(fileSelection[0]);
    }
  }));
  
  /**
   * @summary Returns a promise of the correct document text
   * @returns {Promise<String>} document text
   *  - first document in documentsFileArray state if it exists
   *  - documentsURL resource file otherwise
   */
  getDocsUpload = () => (new Promise((resolve) => {
    if (this.state.documentsFileArray.length === 0) {
      this.state.ldaModel.documentType = this.state.defaultExt;
      resolve(d3.text(this.state.documentsURL));
    } else {
      const fileSelection = this.state.documentsFileArray[0].slice();
      var reader = new FileReader();
      reader.onload = function() {
        resolve(reader.result);
      };
      reader.readAsText(fileSelection[0]);
    }
  }));


  /**
   * @summary Runs the document processing pipeline
   */
  queueLoad = () => {
    this.resetNotes(this.state.ldaModel.numTopics)
    this.state.ldaModel.reset();
    Promise.all([this.getStoplistUpload(),this.getDocsUpload()])
      .then(([stops, lines]) => {this.state.ldaModel.ready(null, stops, lines)})
      .catch(err => this.state.ldaModel.ready(err, null, null));
  }
  

  /**
   * @summary This function is the callback for "input", it changes as we move the slider without releasing it.
   */
  updateTopicCount(input) {
    d3.select("#num_topics_display").text(input.value);
  }

  /**
   * @summary This function is the callback for "change"
   */
  onTopicsChange = (val) => {
      console.log("Changing # of topics: " + val);
      
      var newNumTopics = Number(val);
      if (! isNaN(newNumTopics) && newNumTopics > 0 && newNumTopics !== this.state.ldaModel.numTopics) {
        this.state.ldaModel.changeNumTopics(Number(val));
      }
    
  }

  componentDidMount() {
    // TODO turn d3 into react
    // Set upon initialisation, changed to new numTopics in reset
    d3.select("#num-topics-input").attr("value", this.state.ldaModel.numTopics);
    this.queueLoad();
  }

  /**
   * @summary Callback function for pressing the run iterations button
   */
  changeSweepAmount = (val) => {
    this.setState( {
      sweepParameter: parseInt(val, 10)
    })
  }

  /**
   * @summary Callback function for pressing the stop button
   */
  stopButtonClick = () => {
    this.state.ldaModel.stopSweeps();
  }

  runIterationsClick = () => {
    this.state.ldaModel.addSweepRequest(this.state.sweepParameter);
  }

  render() {
    var DisplayPage;
    switch (this.state.selectedTab) {
      case "docs-tab":
        DisplayPage = <TopicDoc 
          selectedTopic={this.state.ldaModel.selectedTopic} 
          documents={this.state.ldaModel.documents} 
          sortVocabByTopic={this.state.ldaModel.sortVocabByTopic} 
          numTopics={this.state.ldaModel.numTopics}
          update = {this.state.update}
          tokensPerTopic = {this.state.ldaModel.tokensPerTopic}
          wordTopicCounts = {this.state.ldaModel.wordTopicCounts}
          highestWordTopicCount = {this.state.ldaModel.highestWordTopicCount}
          topicSaliency = {this.state.ldaModel.topicSaliency}
          maxTopicSaliency = {this.state.ldaModel.maxTopicSaliency}
        />;
        break;
      case "corr-tab":
        DisplayPage = <Correlation 
          topicWordCounts ={this.state.ldaModel.topicWordCounts}  
          numTopics={this.state.ldaModel.numTopics} 
          documents={this.state.ldaModel.documents}
          getTopicCorrelations={this.state.ldaModel.getTopicCorrelations}
          changeNotes = {this.changeNotes}
          provideNotes = {this.provideNotes}
          tooltip = {corrTooltip}
          update = {this.state.update}/>;
        break;
      case "vocab-tab":
        DisplayPage = <VocabTable 
          sortVocabByTopic={this.state.ldaModel.sortVocabByTopic}
          sortbyTopicChange={this.state.ldaModel.sortbyTopicChange}
          vocabularyCounts={this.state.ldaModel.vocabularyCounts}
          wordTopicCounts={this.state.ldaModel.wordTopicCounts}
          selectedTopic={this.state.ldaModel.selectedTopic}
          stopwords ={this.state.ldaModel.stopwords}
          numTopics={this.state.ldaModel.numTopics}
          byCountDescending={this.state.ldaModel.byCountDescending}
          addStop = {this.state.ldaModel.addStop}
          removeStop = {this.state.ldaModel.removeStop}
          update = {this.state.update}
          modelIsRunning = {this.state.ldaModel.modelIsRunning}/>;
          
        break;
      case "ts-tab":
        DisplayPage = <TimeSeries 
          numTopics={this.state.ldaModel.numTopics}
          documents={this.state.ldaModel.documents}
          topicWordCounts={this.state.ldaModel.topicWordCounts}
          selectedTopic={this.state.ldaModel.selectedTopic}
          update = {this.state.update}
          topicTimeRollingAvg = {this.state.ldaModel.topicTimeRollingAvg}
          />;
        break;
      case "dl-tab":
        DisplayPage = <DLPage
          numTopics={this.state.ldaModel.numTopics}
          documents={this.state.ldaModel.documents}
          annotations = {this.annotations}
          wordTopicCounts={this.state.ldaModel.wordTopicCounts}
          topicWordCounts={this.state.ldaModel.topicWordCounts}
          sortTopicWords={this.state.ldaModel.sortTopicWords}
          getTopicCorrelations={this.state.ldaModel.getTopicCorrelations}
          tokensPerTopic={this.state.ldaModel.tokensPerTopic}
          downloadModel={this.downloadModel}/>;
        break;
      case "home-tab":
        DisplayPage = <HomePage
          onDocumentFileChange={this.onDocumentFileChange}
          onStopwordFileChange={this.onStopwordFileChange}
          onModelFileChange={this.onModelFileChange}
          onFileUpload={this.queueLoad}
          onModelUpload={this.onModelUpload}
          modelIsRunning = {this.state.ldaModel.modelIsRunning}
          onDefaultDocChange = {this.onDefaultDocChange}
          docName={this.state.docName}
          />
        break;
      case "meta-tab":
        DisplayPage = <MetaData
          metaTopicAverages={this.state.ldaModel.metaTopicAverages}
          metaFields={this.state.ldaModel.metaFields}
          selectedTopic={this.state.ldaModel.selectedTopic}
          topicAvgsForCatagory={this.state.ldaModel.topicAvgsForCatagory}
          metaValues={this.state.ldaModel.metaValues}
          docTopicMetaValues={this.state.ldaModel.docTopicMetaValues}
          topicWordCounts={this.state.ldaModel.topicWordCounts}
          numTopics={this.state.ldaModel.numTopics}
          />
        break;
      default:
        DisplayPage = null;
        break;
    }

    return (
      <div id="app">
      <div id="tooltip"></div>

      <div id="main">

      <TopBar completeSweeps={this.state.ldaModel.completeSweeps} 
            requestedSweeps = {this.state.ldaModel.requestedSweeps} 
            numTopics={this.state.ldaModel.numTopics} 
            onClick={this.runIterationsClick} 
            updateNumTopics={this.onTopicsChange} 
            sweepParameter={this.state.sweepParameter}
            onChange={this.changeSweepAmount}
            stopButtonClick={this.state.ldaModel.stopSweeps}
            iter={this.state.ldaModel.completeSweeps}
            modelIsRunning = {this.state.ldaModel.modelIsRunning}
            />


      <SideBar selectedTopic={this.state.ldaModel.selectedTopic} 
               changeAnnotation = {this.changeAnnotation}
               resetAnnotation = {this.resetNotes}
               getAnnotation = {this.getAnnotation}
               sortVocabByTopic={this.state.ldaModel.sortVocabByTopic} 
               numTopics={this.state.ldaModel.numTopics} 
               topicWordCounts={this.state.ldaModel.topicWordCounts}
               selectedTopicChange = {this.state.ldaModel.selectedTopicChange}
               />

      <div id="tabwrapper">
      <NavBar onClick={this.changeTab}/>
      <div id="pages">

      {!this.state.ldaModel ? null : DisplayPage}

      </div>
      </div>
      </div>
      </div>
    );
  };
}

export default App;