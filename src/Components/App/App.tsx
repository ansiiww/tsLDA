import React, {ChangeEvent, Component} from 'react';

import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

import * as d3 from 'd3';

import {getObjectKeys} from '../../funcs/utilityFunctions'
import LDAModel from '../../LDAModel/LDAModel'
import ModelDataDLer from '../../LDAModel/ModelDataDLer'

import DocPage from '../Pages/TopicDoc/DocPage';
import Correlation from '../Pages/Correlation';
import SideBar from '../SideBar/SideBar';
import VocabTable from '../Pages/VocabTable';
import TimeSeries from '../Pages/TimeSeries';
import NavBar from '../Header/NavBar';
import TopBar from '../Header/TopBar';
import DLPage from '../Pages/DLPage';
import HomePage from '../Pages/HomePage';
import MetaData from '../Pages/MetaData/MetaData';
import TopicOverviewPage from '../Pages/TopicOverview/TopicOverviewPage';

import stateOfUnionDocs from '../../defaultDocs/stateOfUnionDocs.txt';
import moviePlotsDocs from '../../defaultDocs/wikiMoviePlots.csv';
import yelpReviews from '../../defaultDocs/yelpReviews.csv';
import defaultStops from '../../defaultDocs/stoplist.txt';
import corrTooltip from '../Tooltip/corrTooltip.png';


// This adds the Object.keys() function to some old browsers that don't support it
if (!Object.keys) {
    Object.keys = (getObjectKeys());
}

interface AppProps {
}

interface AppStates {
    ldaModel: LDAModel,
    modelDataDLer: ModelDataDLer,
    docName: string,
    documentsURL: string,
    stopwordsURL: string,
    defaultExt: string,
    documentsFileArray: File[][]
    stoplistFileArray: File[][],
    modelFileArray: File[][]
    selectedTab: string,
    sweepParameter: number,
    update: boolean
}

class App extends Component<AppProps, AppStates> {
    constructor(props) {
        super(props)

        let ldaModel = new LDAModel(this.startingNumTopics, this.modelForceUpdate.bind(this));

        this.state = {
            ldaModel: ldaModel,
            modelDataDLer: new ModelDataDLer(ldaModel, this),

            // The file location of default files
            docName: "Movie Plots",
            documentsURL: moviePlotsDocs,
            stopwordsURL: defaultStops,
            defaultExt: "text/csv",

            // Location to store uploaded files
            documentsFileArray: [],
            stoplistFileArray: [],
            modelFileArray: [],

            selectedTab: "home-tab",
            sweepParameter: 100,

            update: true,
        };
    };

    startingNumTopics = 25;

    /**
     * @summary function used by model to force update of webpage
     */
    modelForceUpdate() {
        this.forceUpdate();
        console.log("Forced Update");
    }

    downloadModel() {
        const fileName = "jsLDA_Model";
        const json = JSON.stringify(this.state.ldaModel);
        const blob = new Blob([json], {type: 'application/json'});
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
    changeNotes(notes:string) {
        this.corNotes = notes;
    }

    provideNotes() {
        return this.corNotes;
    }

    // Data and functions for annotations in sidebar (placed here instead of as a state to avoid re-rendering)
    annotations: string[] = [];

    changeAnnotation(text:string, i:number) {
        this.annotations[i] = text;
        this.modelForceUpdate();
    }

    resetNotes(i) {
        this.annotations = new Array(i);
    }

    /**
     * @summary Gets the annotaion for a topic
     * @param {Number} topic Number of topic to get annotations for
     */
    getAnnotation(topic:number) {
        return this.annotations[topic];
    }


    /**
     * @summary Update the page/tab user is looking at, causing rerender of components
     */
    changeTab(tabID:string) {
        this.setState({
            selectedTab: tabID
        });

        console.log("Tab is now: " + tabID)
    }

    /**
     * @summary Change regex tokenizer and update model
     */
    onTokenRegexChange(inputRegex:RegExp) {
        this.state.ldaModel.setTokenRegex(inputRegex);
        this.queueLoad();
    }

    /**
     * @summary Load in new default document
     */
    onDefaultDocChange(event: ChangeEvent<HTMLSelectElement>) {
        event.preventDefault();

        let docName = event.target.value;
        this.setState({
            docName: docName,
        });

        if (docName === "State Of The Union") {
            this.setState({
                documentsURL: stateOfUnionDocs,
                defaultExt: "text/txt"
            });
        } else if (docName === "Movie Plots") {
            this.setState({
                documentsURL: moviePlotsDocs,
                defaultExt: "text/csv"
            });
        } else if (docName === "Yelp Reviews") {
            this.setState({
                documentsURL: yelpReviews,
                defaultExt: "text/csv"
            });
        }
    }


    /**
     * @summary Retrieve doc files from upload component and set documentType
     */
    onDocumentFileChange(event: ChangeEvent<HTMLInputElement>) {
        event.preventDefault();

        // Prevent empty file change errors
        if (event.target.files === null) {
            return;
        }

        this.setState({
            documentsFileArray: [Array.prototype.slice.call(event.target.files)],
        });
        if (event.target.files[0] != null) {
            this.state.ldaModel.setDocumentType(event.target.files[0].name);
        }
    }

    /**
     * @summary Retrieve stop word files from upload component
     */
    onStopwordFileChange(event: ChangeEvent<HTMLInputElement>) {
        event.preventDefault();

        // Prevent empty file change errors
        if (event.target.files === null) {
            return;
        }

        this.setState({
            stoplistFileArray: [Array.prototype.slice.call(event.target.files)],
        });

    }

    /**
     * @summary Retrieve model file from upload component
     * @param {Event} event file change event
     */
    onModelFileChange(event: ChangeEvent<HTMLInputElement>) {
        event.preventDefault();

        // Prevent empty file change errors
        if (event.target.files === null) {
            return;
        }

        this.setState({
            modelFileArray: [Array.prototype.slice.call(event.target.files)],
        });
    }

    onModelUpload() {
        new Promise<LDAModel>((resolve, reject) => {
            const fileSelection = this.state.modelFileArray[0].slice();

            // Read file
            let reader = new FileReader();
            reader.onload=()=> {
                // Create a new LDAModel to put uploaded info into
                try {
                    resolve(Object.assign(
                        new LDAModel(this.startingNumTopics, this.modelForceUpdate),
                        JSON.parse(reader.result as string)));

                } catch {
                    reject("Could not interpret model file. Upload canceled.")
                }
            }
            ;
            reader.readAsText(fileSelection[0]);
        }).then((result) => {
            result.modelUploaded()
            this.setState({ldaModel: result});
            // d3 controls itteration display, so this is the only
            // way to update it.
            d3.select("#iters").text(result._completeSweeps);
        }, (reject) => {
            alert(reject)
        })
    }

    /**
     * @summary Returns a promise of the correct stopword text
     * @returns {Promise<String>} stopword text
     *  - first document in documentsFileArray state if it exists
     *  - stopwordsURL resource file otherwise
     */
    getStoplistUpload(): Promise<string> {
        return new Promise((resolve) => {
            if (this.state.stoplistFileArray.length === 0) {
                resolve(d3.text(this.state.stopwordsURL));
            } else {
                const fileSelection = this.state.stoplistFileArray[0].slice();
                let reader = new FileReader();
                reader.onload = function () {
                    resolve(reader.result as string);
                };
                reader.readAsText(fileSelection[0]);
            }
        })
    };

    /**
     * @summary Returns a promise of the correct document text
     * @returns {Promise<String>} document text
     *  - first document in documentsFileArray state if it exists
     *  - documentsURL resource file otherwise
     */
    getDocsUpload(): Promise<string> {
        return new Promise((resolve) => {
            if (this.state.documentsFileArray.length === 0) {
                this.state.ldaModel.setDocumentType(this.state.defaultExt);
                resolve(d3.text(this.state.documentsURL));
            } else {
                const fileSelection = this.state.documentsFileArray[0].slice();
                let reader = new FileReader();
                reader.onload = function () {
                    resolve(reader.result as string);
                };
                reader.readAsText(fileSelection[0]);
            }
        })
    };


    /**
     * @summary Runs the document processing pipeline
     */
    queueLoad() {
        this.resetNotes(this.state.ldaModel.numTopics)
        this.state.ldaModel.reset();
        Promise.all<string, string>([this.getStoplistUpload(), this.getDocsUpload()])
            .then(([stops, lines]) => {
                this.state.ldaModel.ready(null, stops, lines)
            })
            .catch(err => {
                console.error("Error during queueLoad")
                console.error(err)
                this.state.ldaModel.ready(err, '', '')
            });
            this.setState({documentsFileArray: []});
    }

    /**
     * @summary Runs the document processing pipeline for bigrams
     */
    _initializeBigram() {
        Promise.all([this.getDocsUpload()])
            .then(([lines]) => {
                this.state.ldaModel._parseBigram(lines)
            })
    }

    /**
     * @summary changes bigram status in ldamodel
     */
    changeBigramStatus(bigramStatus: boolean) {
        if (!this.state.ldaModel.bigramInitialized) {
            this._initializeBigram();
        } else {
            this.state.ldaModel._changeBigramStatus(bigramStatus);
        }
        this.forceUpdate();
    }

    /**
     * @summary This function is the callback for "input", it changes as we move the slider without releasing it.
     */
    updateTopicCount(input) {
        // TODO: is this used anywhere?
        d3.select("#num_topics_display").text(input.value);
    }

    /**
     * @summary This function is the callback for "change"
     */
    onTopicsChange(val: string) {
        console.log("Changing # of topics: " + val);

        let newNumTopics = Number(val);
        if (!isNaN(newNumTopics) && newNumTopics > 0 && newNumTopics !== this.state.ldaModel.numTopics) {
            this.state.ldaModel.changeNumTopics(Number(val));
        }

        this.resetNotes(this.state.ldaModel.numTopics);
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
    changeSweepAmount(val: string) {
        this.setState({
            sweepParameter: parseInt(val, 10)
        })
    }

    /**
     * @summary Callback function for pressing the stop button
     */
    stopButtonClick() {
        this.state.ldaModel.stopSweeps();
    }

    runIterationsClick() {
        console.log(this.state.ldaModel, 'clicked')
        this.state.ldaModel.addSweepRequest(this.state.sweepParameter);
    }

    render() {
        let DisplayPage;
        switch (this.state.selectedTab) {
            case "docs-tab":
                DisplayPage = <DocPage
                    ldaModel={this.state.ldaModel}
                />;
                break;
            case "corr-tab":
                DisplayPage = <Correlation
                    topicWordCounts={this.state.ldaModel.topicWordCounts}
                    numTopics={this.state.ldaModel.numTopics}
                    documents={this.state.ldaModel.documents}
                    getTopicCorrelations={this.state.ldaModel.getTopicCorrelations.bind(this.state.ldaModel)}
                    changeNotes={this.changeNotes.bind(this)}
                    provideNotes={this.provideNotes.bind(this)}
                    tooltip={corrTooltip}
                    update={this.state.update}/>;
                break;
            case "vocab-tab":
                DisplayPage = <VocabTable
                    sortVocabByTopic={this.state.ldaModel.sortVocabByTopic}
                    sortbyTopicChange={this.state.ldaModel.sortbyTopicChange.bind(this.state.ldaModel)}
                    vocabularyCounts={this.state.ldaModel.vocabularyCounts}
                    wordTopicCounts={this.state.ldaModel.wordTopicCounts}
                    selectedTopic={this.state.ldaModel.selectedTopic}
                    stopwords={this.state.ldaModel.stopwords}
                    numTopics={this.state.ldaModel.numTopics}
                    byCountDescending={this.state.ldaModel.byCountDescending}
                    addStop={this.state.ldaModel.addStop.bind(this.state.ldaModel)}
                    removeStop={this.state.ldaModel.removeStop.bind(this.state.ldaModel)}
                    update={this.state.update}
                    modelIsRunning={this.state.ldaModel.modelIsRunning}
                    modelDataDLer={this.state.modelDataDLer}
                />;

                break;
            case "ts-tab":
                DisplayPage = <TimeSeries
                    ldaModel={this.state.ldaModel}
                    update={this.state.update}
                />;
                break;
            case "dl-tab":
                DisplayPage = <DLPage
                    modelDataDLer={this.state.modelDataDLer}/>;
                break;
            case "home-tab":
                DisplayPage = <HomePage/>
                break;
            case "meta-tab":
                DisplayPage = <MetaData
                    metaTopicAverages={this.state.ldaModel.metaTopicAverages.bind(this.state.ldaModel)}
                    metaFields={this.state.ldaModel.metaFields}
                    selectedTopic={this.state.ldaModel.selectedTopic}
                    topicAvgsForCatagory={this.state.ldaModel.topicAvgsForCatagory.bind(this.state.ldaModel)}
                    metaValues={this.state.ldaModel.metaValues.bind(this.state.ldaModel)}
                    docTopicMetaValues={this.state.ldaModel.docTopicMetaValues.bind(this.state.ldaModel)}
                    topicWordCounts={this.state.ldaModel.topicWordCounts}
                    modelDataDLer={this.state.modelDataDLer}/>
                break;
            case "to-tab":
                DisplayPage = <TopicOverviewPage
                    ldaModel={this.state.ldaModel}
                    annotations={this.annotations}/>
                break;
            default:
                DisplayPage = null;
                break;
        }

        return (
            <div id="app">
                <div id="tooltip"></div>

                <div id="main" style={{display: "flex", flexDirection: "column", height: "100%"}}>

                    <TopBar completeSweeps={this.state.ldaModel._completeSweeps}
                            requestedSweeps={this.state.ldaModel._requestedSweeps}
                            numTopics={this.state.ldaModel.numTopics}
                            onClick={this.runIterationsClick.bind(this)}
                            updateNumTopics={this.onTopicsChange.bind(this)}
                            sweepParameter={this.state.sweepParameter}
                            hyperTune={this.state.ldaModel.hyperTune.bind(this.state.ldaModel)}
                            bigrams={this.changeBigramStatus.bind(this)}
                            onChange={this.changeSweepAmount.bind(this)}
                            stopButtonClick={this.state.ldaModel.stopSweeps.bind(this.state.ldaModel)}
                            iter={this.state.ldaModel._completeSweeps}
                            modelIsRunning={this.state.ldaModel.modelIsRunning}
                            onDocumentFileChange={this.onDocumentFileChange.bind(this)}
                            onStopwordFileChange={this.onStopwordFileChange.bind(this)}
                            onModelFileChange={this.onModelFileChange.bind(this)}
                            onFileUpload={this.queueLoad.bind(this)}
                            onModelUpload={this.onModelUpload.bind(this)}
                            onDefaultDocChange={this.onDefaultDocChange.bind(this)}
                            docName={this.state.docName}
                            optimizeValue={this.state.ldaModel._changeAlpha}
                        // @ts-ignore TS2551 TODO: Fix this
                            bigramValue={this.state.ldaModel.bigrams}
                            tokenRegex={this.state.ldaModel.tokenRegex}
                            changeTokenRegex={this.onTokenRegexChange.bind(this)}
                    />

                    <div style={{display: "flex", flex: "1", overflow: "hidden"}}>
                        <SideBar selectedTopic={this.state.ldaModel.selectedTopic}
                                 changeAnnotation={this.changeAnnotation.bind(this)}
                                 getAnnotation={this.getAnnotation.bind(this)}
                                 sortVocabByTopic={this.state.ldaModel.sortVocabByTopic}
                                 numTopics={this.state.ldaModel.numTopics}
                                 topicVisibility={this.state.ldaModel.topicVisibility}
                                 setTopicVisibility={this.state.ldaModel.setTopicVisibility.bind(this.state.ldaModel)}
                                 topicWordCounts={this.state.ldaModel.topicWordCounts}
                                 selectedTopicChange={this.state.ldaModel.selectedTopicChange.bind(this.state.ldaModel)}
                        />

                        <div id="tabwrapper">
                            <NavBar onClick={this.changeTab.bind(this)}/>
                            <div id="pages">
                            </div>


                            {!this.state.ldaModel ? null : DisplayPage}

                        </div>
                    </div>
                </div>
            </div>
        );
    };
}

export default App;