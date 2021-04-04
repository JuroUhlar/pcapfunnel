import React, { PureComponent, ReactNode } from 'react';
import { Dataset } from '../../types/Dataset';
import { isFirefox } from '../../utils/browserDetection';

interface Props {
    cancelSocket: () => void,
    setDownloadProgress: React.Dispatch<React.SetStateAction<number | null>>,
    changeDataset: (dataset: Dataset) => any,
    setLoadingInDashboard: (loading: boolean) => void,
}

/**
 * Component that renders a dropdown allowing the user to load one of the provided demo datasets
 */
class LoadDemoDataset extends PureComponent<Props> {
    getDemoDataset = (path: string) => {
        this.props.cancelSocket();
        const totalBytes = +path.split('_')[1].split('.')[0];
        const xhr = new XMLHttpRequest();
        xhr.responseType = 'json';
        if (!isFirefox()) xhr.onprogress = (event) => {
            let percentDownloaded = (event.loaded / totalBytes * 100 | 0);
            this.props.setDownloadProgress(percentDownloaded);
        }
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

    render(): ReactNode {
        return (
            <select
                onChange={(e) => this.getDemoDataset(e.target.value)}
                defaultValue=''
            >
                <option disabled value='datasets/10MB_3221263.json'> -- select -- </option>
                <option value='datasets/10MB_3221263.json'>Demo dataset</option>
                <option value='datasets/528MB_78284923.json'>task1.pcap</option>
                <option value='datasets/100MB_19861607.json'>task2.pcap</option>
                <option value='datasets/task3_2104624.json'>task3.pcap</option>
                <option value='datasets/task4_22249922.json'>task4.pcap</option>
                <option value='datasets/10MB_3221263.json'>task5.pcap</option>
                {/* <option value='datasets/60KB_31680.json'>0.1 MB Pcap</option> */}
                {/* <option value='datasets/1GB_161583868.json'>1000 MB Pcap</option> */}
            </select>
        )
    }
}

export default LoadDemoDataset
