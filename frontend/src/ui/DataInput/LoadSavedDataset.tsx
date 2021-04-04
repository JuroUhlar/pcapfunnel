import * as React from 'react'
import { Dataset } from '../../types/Dataset';
import { fileServerURL } from '../../utils/config';

interface LoadSavedDatasetProps {
    cancelSocket: () => void,
    setDownloadProgress: React.Dispatch<React.SetStateAction<number | null>>,
    changeDataset: (dataset: Dataset) => any,
    setLoadingInDashboard: (loading: boolean) => void,

}

interface LoadSavedDatasetState {
    datasets: string[];
}

/**
 * Component that renders a dropdown allowing the user to load one of the previously uploaded datasets
 * To be used in layour components (Dashboard, IpView, ConnectionView)
 */
export class LoadSavedDataset extends React.PureComponent<LoadSavedDatasetProps, LoadSavedDatasetState> {
    constructor(props: LoadSavedDatasetProps) {
        super(props);
        this.state = {
            datasets: []
        }
    }

    componentDidMount() {
        this.getSavedDatasetsList();
    }

    getSavedDatasetsList = async () => {
        let response = await fetch(`${fileServerURL}/list-saved`)
        let datasets = await response.json();
        this.setState(() => ({
            datasets
        }));
    }

    loadSavedDataset = (path: string) => {
        this.props.cancelSocket();
        const xhr = new XMLHttpRequest();
        xhr.responseType = 'json';
        xhr.onload = () => {
            let dataset = xhr.response;
            this.props.changeDataset(dataset as Dataset);
            this.props.setLoadingInDashboard(false);
            this.props.setDownloadProgress(null);
        };
        xhr.open('GET', path);
        xhr.send();
        this.props.setLoadingInDashboard(true);
    }

    render() {
        return (

            <select
                onChange={(e) => this.loadSavedDataset(`${fileServerURL}/datasets/${e.target.value}`)}
                defaultValue=''
            >
                <option disabled value=''> -- select -- </option>
                {this.state.datasets.map(dataset => (
                    <option key={dataset}>{dataset}</option>
                ))}
            </select>
        )
    }
}
