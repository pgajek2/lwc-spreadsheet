public class UniversalDataWrapper {

    public class Column {
        @AuraEnabled
        public String label {get; set;}
        @AuraEnabled
        public String fieldName {get; set;}
        @AuraEnabled
        public String type {get; set;}
        @AuraEnabled
        public ColumnAttributes columnAttributes {get; set;}

        public Column(String label, 
                      String fieldName, 
                      String type,
                      ColumnAttributes columnAttributes) {
            this.label = label;
            this.fieldName = fieldName;
            this.type = type;
            this.columnAttributes = columnAttributes;
        }
    }

    public class ColumnAttributes {
        @AuraEnabled
        public Boolean isInlineEditable {get; set;}
        @AuraEnabled
        public String referenceToObjectApi {get; set;}
        @AuraEnabled
        public String referenceToFieldApi {get; set;}

        public ColumnAttributes(Boolean isInlineEditable,
                                String referenceToObjectApi,
                                String referenceToFieldApi) {
            this.isInlineEditable = isInlineEditable;
            this.referenceToObjectApi = referenceToObjectApi;
            this.referenceToFieldApi = referenceToFieldApi;
        }
    }

    public class Data {
        @AuraEnabled
        public String value {get; set;}
        @AuraEnabled
        public String fieldName {get; set;}
        @AuraEnabled
        public String type {get; set;}

        public Data(String value,
                    String fieldName,
                    String type) {
            this.value = value;
            this.fieldName = fieldName;
            this.type = type;
        }
    }
}