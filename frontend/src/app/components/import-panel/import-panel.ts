import { Component, Output, EventEmitter } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-import-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './import-panel.html'
})
export class ImportPanel {
  fileName: string | null = null;
  selectedFile: File | null = null;
  isUploading = false;
  errorMessage: string | null = null;

  // This EventEmitter sends the scored data back up to the parent app
  @Output() dataScored = new EventEmitter<any[]>();

  // Inject HttpClient to make API calls
  constructor(private http: HttpClient) {}

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.fileName = file.name;
      this.errorMessage = null; // Clear previous errors
    }
  }

  // The Generate Button triggers the actual API call
  onGenerateReport(): void {
    if (!this.selectedFile) return;
    
    this.isUploading = true;
    this.errorMessage = null;

    // Package the file into FormData for the API
    const formData = new FormData();
    formData.append('file', this.selectedFile);

    // Make the POST request to your FastAPI backend
    // IMPORTANT: Make sure your FastAPI server is running on port 8000!
    this.http.post<any[]>('http://localhost:8000/score', formData)
      .subscribe({
        next: (response) => {
          this.isUploading = false;
          // Send the response data up to the parent component to render in the table
          this.dataScored.emit(response); 
        },
        error: (err) => {
          console.error('API Error:', err);
          this.isUploading = false;
          this.errorMessage = "Failed to connect to backend. Is the Python server running?";
        }
      });
  }
}