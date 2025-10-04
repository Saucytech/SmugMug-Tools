// SmugMug API Type Definitions

export interface SmugMugAlbum {
  AlbumKey: string;
  Name: string;
  NiceName?: string;
  UrlName?: string;
  UrlPath?: string;
  ImageCount: number;
  Description?: string;
  Keywords?: string;
  SortMethod?: string;
  SortDirection?: string;
  Uri?: string;
  WebUri?: string;
  Uris?: {
    Album?: {
      Uri: string;
    };
    AlbumImages?: {
      Uri: string;
    };
  };
}

export interface SmugMugImage {
  ImageKey: string;
  FileName: string;
  Title?: string;
  Caption?: string;
  Keywords?: string;
  Format: string;
  UploadKey?: string;
  Date?: string;
  DateTimeUploaded?: string;
  DateTimeOriginal?: string;
  
  // URLs for different sizes
  ThumbnailUrl: string;
  ArchivedUri?: string;
  
  Uris?: {
    Image?: {
      Uri: string;
    };
    ImageSizes?: {
      Uri: string;
    };
    LargeImage?: {
      Url: string;
    };
    MediumImage?: {
      Url: string;
    };
    SmallImage?: {
      Url: string;
    };
    ThumbImage?: {
      Url: string;
    };
    TinyImage?: {
      Url: string;
    };
    OriginalImage?: {
      Url: string;
    };
  };
  
  // Metadata
  Width?: number;
  Height?: number;
  Size?: number;
  Watermarked?: boolean;
  Hidden?: boolean;
  
  // EXIF data
  Altitude?: number;
  Latitude?: number;
  Longitude?: number;
  Make?: string;
  Model?: string;
  ISO?: number;
  FocalLength?: number;
  Aperture?: number;
  ShutterSpeed?: string;
}

export interface SmugMugUser {
  NickName: string;
  Name?: string;
  FirstName?: string;
  LastName?: string;
  RefTag?: string;
  ImageCount?: number;
  Uri?: string;
  WebUri?: string;
  Uris?: {
    Node?: {
      Uri: string;
    };
    UserProfile?: {
      Uri: string;
    };
    BioImage?: {
      Uri: string;
    };
    CoverImage?: {
      Uri: string;
    };
  };
}

export interface SmugMugNode {
  NodeID: string;
  Name: string;
  UrlName?: string;
  UrlPath?: string;
  Type: 'Album' | 'Folder' | 'Page' | 'System Album' | 'System Page';
  DateAdded?: string;
  DateModified?: string;
  HasChildren?: boolean;
  Uri?: string;
  WebUri?: string;
}

// API Response wrappers
export interface SmugMugAlbumsResponse {
  albums: SmugMugAlbum[];
}

export interface SmugMugImagesResponse {
  images: SmugMugImage[];
}

export interface SmugMugAuthResponse {
  access_token: string;
  access_token_secret: string;
}

// OAuth types
export interface OAuthToken {
  key: string;
  secret: string;
}

export interface OAuthRequestData {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: Record<string, any>;
}

// Local storage types
export interface StoredTokens {
  accessToken: string | null;
  accessTokenSecret: string | null;
}

// Export format for TacoFam
export interface TacoFamPhotoExport {
  imageKey: string;
  fileName: string;
  title?: string;
  caption?: string;
  thumbnailUrl: string;
  largeUrl?: string;
  originalUrl?: string;
  width?: number;
  height?: number;
  dateUploaded?: string;
  keywords?: string;
}
