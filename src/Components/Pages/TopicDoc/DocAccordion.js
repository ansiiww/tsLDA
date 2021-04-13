import React from 'react'; 
import Accordion from 'react-bootstrap/Accordion';
import DocCard from './DocCard';
import './topicDoc.css';


class DocAccordion extends React.Component {
    render() {
        return (
            <Accordion>
                {this.props.documents
                    .slice(this.props.startDoc,this.props.endDoc)
                    .map( (document) => {
                        return <DocCard 
                            document={document}
                            isTopicSelected={this.props.isTopicSelected}
                            key={document.originalOrder}
                            tokensPerTopic={this.props.tokensPerTopic}
                            wordTopicCounts={this.props.wordTopicCounts}
                            selectedTopic={this.props.selectedTopic}
                            highestWordTopicCount={this.props.highestWordTopicCount}
                            showMetaData={this.props.showMetaData}
                            useSalience={this.props.useSalience}
                            topicSaliency={this.props.topicSaliency}
                            maxTopicSaliency={this.props.maxTopicSaliency}
                        />
                    }
                )}
            </Accordion>
        )
    }
}

export default DocAccordion;