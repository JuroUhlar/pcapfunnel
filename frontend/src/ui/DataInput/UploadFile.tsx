import React, { PureComponent, ReactNode } from 'react'
import { fileServerURL } from '../../utils/config';
import { parsedCsvToDataset } from '../../utils/tsharkToDataset';
import * as csv from 'csvtojson';
import { Dataset } from '../../types/Dataset';
import styles from '../Filters/FiltersImportExport.module.css'

interface Props {
    cancelSocket: () => void,
    setDownloadProgress: React.Dispatch<React.SetStateAction<number | null>>,
    changeDataset: (dataset: Dataset) => any,
    setLoadingInDashboard: (loading: boolean) => void,
    getDatasetProgressivelyFromSocket: (filePath: string, name: string) => void,
    setUploadProgress: React.Dispatch<React.SetStateAction<number | null>>,
    setUploadXHRRequest: React.Dispatch<React.SetStateAction<XMLHttpRequest | null>>,
}

/**
 * Component that allows the user to upload their own PCAP file, tshark output in CSV,
 * or JSON file with a Dataset of packets already in PCAPFunnel format
 */
class UploadFile extends PureComponent<Props> {

    handleFileChange = (event: any) => {
        if (!event.target!.files[0]) {
            console.log("File selection canceled");
            return;
        }

        this.props.setLoadingInDashboard(true);
        this.props.cancelSocket();

        let file = event.target!.files[0];
        let reader = new FileReader();
        let fileExtension = file.name.split('.')[1];
        if (fileExtension === 'json') {
            reader.onload = this.onReaderLoad_JSON;
            reader.readAsText(file);
        }
        if (fileExtension === 'csv') {
            reader.onload = this.onReaderLoad_CSV;
            reader.readAsText(file);
        }
        if (fileExtension === 'pcap') {
            var data = new FormData();
            data.append("pcap", file);
            var xhr = new XMLHttpRequest();
            xhr.addEventListener("readystatechange", () => {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        let response = JSON.parse(xhr.response);
                        this.props.getDatasetProgressivelyFromSocket(response.filePath, response.name);
                    } else {
                        // Headers mean server response, not user abort
                        if (xhr.getAllResponseHeaders()) {
                            console.log(`Error ${xhr.status}: ${xhr.statusText}`);
                            alert('Uplaoding file failed');
                        }
                    }
                }
            });
            xhr.upload.addEventListener("progress", (event) => {
                if (event.lengthComputable) {
                    var percentUploaded = (event.loaded / event.total * 100 | 0);
                    this.props.setUploadProgress(percentUploaded);
                }
            });

            xhr.open("POST", `${fileServerURL}/upload-pcap`);
            xhr.send(data);
            this.props.setUploadXHRRequest(xhr);
            this.props.setUploadProgress(0);
        } else {
            console.log('Filetype not supported');
            this.props.setLoadingInDashboard(false);
        }
    }

    onReaderLoad_JSON = (event: any) => {
        var json = JSON.parse(event.target.result);
        this.props.changeDataset(json as Dataset);
        this.props.setLoadingInDashboard(false);
    };

    onReaderLoad_CSV = async (event: any) => {
        let csvString = event.target.result;
        const jsonArray = await csv.default({ flatKeys: true }).fromString(csvString);
        let dataset = parsedCsvToDataset(jsonArray);
        this.props.changeDataset(dataset);
        this.props.setLoadingInDashboard(false);
    };

    render(): ReactNode {
        return (
            <div className={`${styles.fileUpload} my-button`}>
                <span>File</span>
                <input onChange={this.handleFileChange} type="file" className={styles.upload} accept=".json, .csv, .pcap"/>
            </div>
        )
    }
}

export default UploadFile
